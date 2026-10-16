using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using System.Xml.Linq;
using EspGisViewer.Data;
using EspGisViewer.Routes.Wfs;
using EspGisViewer.Routing;
using EspGisViewer.Util;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SQLite;

namespace EspGisViewer.DiffTests.Tests
{
    [TestFixture]
    public class StabilityTests
    {
        private readonly List<SQLiteConnection> _databases = new List<SQLiteConnection>();
        private readonly List<string> _paths = new List<string>();
        private TestDataSource _source;
        private WfsGetFeatureController _controller;

        [SetUp]
        public void SetUp()
        {
            SQLitePCL.Batteries_V2.Init();
            _source = new TestDataSource(CreateDatabase("native"));
            _controller = new WfsGetFeatureController(_source, "plans");
        }

        [TearDown]
        public void TearDown()
        {
            foreach (var database in _databases) database.Close();
            foreach (var path in _paths) File.Delete(path);
            _databases.Clear();
            _paths.Clear();
        }

        private TestConnection CreateDatabase(string formatter)
        {
            var path = Path.GetTempFileName();
            _paths.Add(path);
            var database = new SQLiteConnection(path);
            _databases.Add(database);
            database.Execute("CREATE TABLE plans (id INTEGER PRIMARY KEY, featureset TEXT, floors TEXT, latitude REAL, longitude REAL)");
            database.Execute(@"WITH RECURSIVE ids(id) AS (SELECT 1 UNION ALL SELECT id + 1 FROM ids WHERE id < 1005)
                INSERT INTO plans SELECT id, 'plans', '[""Ground"", ""First""]', -27.5, 153.0 FROM ids");
            database.Execute("CREATE TABLE feature_output_formats (table_name TEXT, column_name TEXT, source_format TEXT, output_format TEXT, formatter TEXT, options TEXT)");
            database.Execute("INSERT INTO feature_output_formats VALUES ('plans', 'floors', 'json', 'geojson', ?, NULL)", formatter);
            database.Execute("INSERT INTO feature_output_formats VALUES ('plans', 'floors', 'json', 'xml', 'delimited', '{\"separator\":\", \"}')");
            return new TestConnection(database);
        }

        private static HttpContext CreateContext(StringWriter writer)
        {
            return new HttpContext(new HttpRequest("", "http://localhost/wfs/plans", ""), new HttpResponse(writer));
        }

        private string Request(string count, bool geoJson, int expectedStatus = 200)
        {
            var writer = new StringWriter();
            var context = CreateContext(writer);
            var queries = new Dictionary<string, string>();
            if (count != null) queries["count"] = count;
            if (geoJson) queries["outputformat"] = "GEOJSON";
            _controller.HandleRequest(context, new Dictionary<string, string>(), queries);
            Assert.AreEqual(expectedStatus, context.Response.StatusCode);
            if (expectedStatus == 200) Assert.AreEqual(geoJson ? "application/json" : "text/xml", context.Response.ContentType);
            return writer.ToString();
        }

        [TestCase(null, 1000)]
        [TestCase("2147483647", 1000)]
        [TestCase("2", 2)]
        [TestCase("0", 0)]
        public void WfsResponsesAreBoundedInBothEncodings(string count, int expectedCount)
        {
            var json = JObject.Parse(Request(count, true));
            Assert.AreEqual(expectedCount, ((JArray)json["features"]).Count);
            var xml = XDocument.Parse(Request(count, false));
            Assert.AreEqual(expectedCount.ToString(), (string)xml.Root.Attribute("numberReturned"));
            Assert.AreEqual("1005", (string)xml.Root.Attribute("numberMatched"));
            Assert.AreEqual(expectedCount, xml.Root.Elements().Count());
        }

        [TestCase("-1")]
        [TestCase("abc")]
        [TestCase("2147483648")]
        public void InvalidCountsReturnBadRequest(string count)
        {
            Assert.AreEqual("Invalid count", Request(count, true, 400));
        }

        [Test]
        public void OutputFormatsRemainIndependentAndInvalidateOnConnectionReplacement()
        {
            var first = JObject.Parse(Request("1", true));
            CollectionAssert.AreEqual(new[] { "Ground", "First" }, first["features"][0]["properties"]["floors"].Values<string>());
            var xml = XDocument.Parse(Request("1", false));
            Assert.AreEqual("Ground, First", xml.Descendants("floors").Single().Value);
            Assert.AreEqual(Request("1", true), first.ToString(Newtonsoft.Json.Formatting.None));
            _source.Connection = CreateDatabase("delimited");
            var replacement = JObject.Parse(Request("1", true));
            Assert.AreEqual("Ground, First", (string)replacement["features"][0]["properties"]["floors"]);
        }

        [Test]
        public void ConcurrentWfsRequestsMatchSerialPayloads()
        {
            var expectedJson = Request("10", true);
            var expectedXml = Request("10", false);
            var requests = Enumerable.Range(0, 64).Select(index => Task.Run(() =>
            {
                var geoJson = index % 2 == 0;
                Assert.AreEqual(geoJson ? expectedJson : expectedXml, Request("10", geoJson));
            })).ToArray();
            Assert.IsTrue(Task.WaitAll(requests, 10000));
        }

        [Test]
        public void FileSystemRefreshSerializesReplacementWithRetainedConnections()
        {
            var directory = Path.Combine(Path.GetTempPath(), "esp-refresh-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            FileSystemDataSource source = null;
            var release = new ManualResetEventSlim();
            var entered = new ManualResetEventSlim();
            var refreshAttempted = new ManualResetEventSlim();
            Task<int> active = null;
            Task refresh = null;
            try
            {
                CreatePackage(Path.Combine(directory, "test-combined-20261015.gpkg"), 1);
                source = new FileSystemDataSource(directory);
                var retained = source.TilesAndFeatures;
                source.Refresh(true);
                Assert.AreSame(retained, source.TilesAndFeatures);

                active = Task.Run(() => retained.Use(database =>
                {
                    entered.Set();
                    Assert.IsTrue(release.Wait(10000));
                    return database.ExecuteScalar<int>("SELECT value FROM marker");
                }));
                Assert.IsTrue(entered.Wait(5000));
                CreatePackage(Path.Combine(directory, "test-combined-20261016.gpkg"), 2);
                refresh = Task.Run(() =>
                {
                    refreshAttempted.Set();
                    source.Refresh(true);
                });
                Assert.IsTrue(refreshAttempted.Wait(5000));
                Assert.IsFalse(refresh.Wait(200));
                release.Set();
                Assert.IsTrue(active.Wait(5000));
                Assert.AreEqual(1, active.Result);
                Assert.IsTrue(refresh.Wait(5000));
                Assert.AreNotSame(retained, source.TilesAndFeatures);

                var requests = Enumerable.Range(0, 64).Select(index => Task.Run(() =>
                {
                    source.Refresh(true);
                    var connection = index % 2 == 0 ? retained : source.TilesAndFeatures;
                    Assert.AreEqual(2, connection.Use(database => database.ExecuteScalar<int>("SELECT value FROM marker")));
                })).ToArray();
                Assert.IsTrue(Task.WaitAll(requests, 10000));
            }
            finally
            {
                release.Set();
                if (active != null) Assert.IsTrue(active.Wait(5000));
                if (refresh != null) Assert.IsTrue(refresh.Wait(5000));
                if (source != null) source.TilesAndFeatures.Use(database => database.Close());
                release.Dispose();
                entered.Dispose();
                refreshAttempted.Dispose();
                Directory.Delete(directory, true);
            }
        }

        private static void CreatePackage(string path, int value)
        {
            using (var database = new SQLiteConnection(path))
            {
                database.Execute("CREATE TABLE marker (value INTEGER)");
                database.Execute("INSERT INTO marker VALUES (?)", value);
            }
        }

        [Test]
        public void QueueRemainsUsableAfterFailure()
        {
            var queue = new TaskQueue<int>(42);
            try
            {
                queue.Request<int>(value => throw new InvalidOperationException("expected"));
                Assert.Fail("The queue must propagate failures.");
            }
            catch (InvalidOperationException) { }
            Assert.AreEqual(42, queue.Request(value => value));
        }

        [Test]
        public void SynchronousHandlerRunsOnCallingThreadAndCompletesBeforeReturning()
        {
            var callingThread = Thread.CurrentThread.ManagedThreadId;
            var handlerThread = 0;
            var handlerCount = 0;
            var handler = Routers.Create(router => router.SetHandler((context, parameters) =>
            {
                handlerThread = Thread.CurrentThread.ManagedThreadId;
                handlerCount++;
                context.Response.Write("complete");
            }, true));
            var writer = new StringWriter();
            Assert.IsFalse(handler is IHttpAsyncHandler);
            handler.ProcessRequest(CreateContext(writer));
            Assert.AreEqual(callingThread, handlerThread);
            Assert.AreEqual(1, handlerCount);
            Assert.AreEqual("complete", writer.ToString());
        }

        private sealed class TestDataSource : DataSource
        {
            public TestDataSource(TestConnection connection) { Connection = connection; }
            public TestConnection Connection { get; set; }
            public override DataConnection TilesAndFeatures => Connection;
            protected override void CheckForNewData() { }
        }

        private sealed class TestConnection : DataConnection
        {
            private readonly TaskQueue<SQLiteConnection> _queue;
            public TestConnection(SQLiteConnection database) { _queue = new TaskQueue<SQLiteConnection>(database); }
            public override T Use<T>(Func<SQLiteConnection, T> action) => _queue.Request(action);
        }
    }
}