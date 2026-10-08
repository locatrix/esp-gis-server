using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
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
        private readonly List<SQLiteAsyncConnection> _databases = new List<SQLiteAsyncConnection>();
        private readonly List<string> _paths = new List<string>();
        private TestDataSource _source;
        private WfsGetFeatureController _controller;

        [SetUp]
        public async Task SetUp()
        {
            SQLitePCL.Batteries_V2.Init();
            _source = new TestDataSource(await CreateDatabase("native"));
            _controller = new WfsGetFeatureController(_source, "plans");
        }

        [TearDown]
        public async Task TearDown()
        {
            foreach (var database in _databases) await database.CloseAsync();
            foreach (var path in _paths) File.Delete(path);
            _databases.Clear();
            _paths.Clear();
        }

        private async Task<TestConnection> CreateDatabase(string formatter)
        {
            var path = Path.GetTempFileName();
            _paths.Add(path);
            var database = new SQLiteAsyncConnection(path);
            _databases.Add(database);
            await database.ExecuteAsync("CREATE TABLE plans (id INTEGER PRIMARY KEY, featureset TEXT, floors TEXT, latitude REAL, longitude REAL)");
            await database.ExecuteAsync(@"WITH RECURSIVE ids(id) AS (SELECT 1 UNION ALL SELECT id + 1 FROM ids WHERE id < 1005)
                INSERT INTO plans SELECT id, 'plans', '[""Ground"", ""First""]', -27.5, 153.0 FROM ids");
            await database.ExecuteAsync("CREATE TABLE feature_output_formats (table_name TEXT, column_name TEXT, source_format TEXT, output_format TEXT, formatter TEXT, options TEXT)");
            await database.ExecuteAsync("INSERT INTO feature_output_formats VALUES ('plans', 'floors', 'json', 'geojson', ?, NULL)", formatter);
            await database.ExecuteAsync("INSERT INTO feature_output_formats VALUES ('plans', 'floors', 'json', 'xml', 'delimited', '{\"separator\":\", \"}')");
            return new TestConnection(database);
        }

        private static HttpContext CreateContext(StringWriter writer)
        {
            return new HttpContext(new HttpRequest("", "http://localhost/wfs/plans", ""), new HttpResponse(writer));
        }

        private async Task<string> Request(string count, bool geoJson, int expectedStatus = 200)
        {
            var writer = new StringWriter();
            var context = CreateContext(writer);
            var queries = new Dictionary<string, string>();
            if (count != null) queries["count"] = count;
            if (geoJson) queries["outputformat"] = "GEOJSON";
            await _controller.HandleRequest(context, new Dictionary<string, string>(), queries);
            Assert.AreEqual(expectedStatus, context.Response.StatusCode);
            if (expectedStatus == 200) Assert.AreEqual(geoJson ? "application/json" : "text/xml", context.Response.ContentType);
            return writer.ToString();
        }

        [TestCase(null, 1000)]
        [TestCase("2147483647", 1000)]
        [TestCase("2", 2)]
        [TestCase("0", 0)]
        public async Task WfsResponsesAreBoundedInBothEncodings(string count, int expectedCount)
        {
            var json = JObject.Parse(await Request(count, true));
            Assert.AreEqual(expectedCount, ((JArray)json["features"]).Count);
            var xml = XDocument.Parse(await Request(count, false));
            Assert.AreEqual(expectedCount.ToString(), (string)xml.Root.Attribute("numberReturned"));
            Assert.AreEqual("1005", (string)xml.Root.Attribute("numberMatched"));
            Assert.AreEqual(expectedCount, xml.Root.Elements().Count());
        }

        [TestCase("-1")]
        [TestCase("abc")]
        [TestCase("2147483648")]
        public async Task InvalidCountsReturnBadRequest(string count)
        {
            Assert.AreEqual("Invalid count", await Request(count, true, 400));
        }

        [Test]
        public async Task OutputFormatsRemainIndependentAndInvalidateOnConnectionReplacement()
        {
            var first = JObject.Parse(await Request("1", true));
            CollectionAssert.AreEqual(new[] { "Ground", "First" }, first["features"][0]["properties"]["floors"].Values<string>());
            var xml = XDocument.Parse(await Request("1", false));
            Assert.AreEqual("Ground, First", xml.Descendants("floors").Single().Value);
            Assert.AreEqual(await Request("1", true), first.ToString(Newtonsoft.Json.Formatting.None));
            _source.Connection = await CreateDatabase("delimited");
            var replacement = JObject.Parse(await Request("1", true));
            Assert.AreEqual("Ground, First", (string)replacement["features"][0]["properties"]["floors"]);
        }

        [Test]
        public async Task ConcurrentWfsRequestsMatchSerialPayloads()
        {
            var expectedJson = await Request("10", true);
            var expectedXml = await Request("10", false);
            var requests = Enumerable.Range(0, 64).Select(async index =>
            {
                var geoJson = index % 2 == 0;
                Assert.AreEqual(geoJson ? expectedJson : expectedXml, await Request("10", geoJson));
            });
            await Task.WhenAll(requests);
        }

        [Test]
        public async Task QueueRemainsUsableAfterFailure()
        {
            var queue = new TaskQueue<int>(42);
            try
            {
                await queue.Request<int>(value => Task.FromException<int>(new InvalidOperationException("expected")));
                Assert.Fail("The queue must propagate failures.");
            }
            catch (InvalidOperationException) { }
            Assert.AreEqual(42, await queue.Request(value => Task.FromResult(value)));
        }

        [Test]
        public async Task AsyncHandlerPreservesStateAndCompletesCallbackOnce()
        {
            var entered = new TaskCompletionSource<bool>();
            var release = new TaskCompletionSource<bool>();
            var callback = new TaskCompletionSource<IAsyncResult>();
            var callbackCount = 0;
            var handler = Routers.Create(router => router.SetHandler(async (context, parameters) =>
            {
                entered.TrySetResult(true);
                await release.Task;
                context.Response.Write("complete");
            }, true));
            var writer = new StringWriter();
            var state = new object();
            var asyncHandler = (IHttpAsyncHandler)handler;
            var result = asyncHandler.BeginProcessRequest(CreateContext(writer), completed =>
            {
                System.Threading.Interlocked.Increment(ref callbackCount);
                callback.TrySetResult(completed);
            }, state);
            try
            {
                var firstCompleted = await Task.WhenAny(entered.Task, callback.Task, Task.Delay(5000));
                if (firstCompleted != entered.Task && result.IsCompleted)
                {
                    asyncHandler.EndProcessRequest(result);
                }
                Assert.AreSame(entered.Task, firstCompleted, writer.ToString());
                Assert.AreSame(state, result.AsyncState);
                Assert.IsFalse(result.IsCompleted);
            }
            finally { release.TrySetResult(true); }
            Assert.AreSame(callback.Task, await Task.WhenAny(callback.Task, Task.Delay(5000)));
            Assert.AreSame(result, await callback.Task);
            asyncHandler.EndProcessRequest(result);
            Assert.AreEqual(1, callbackCount);
            Assert.IsTrue(result.IsCompleted);
            Assert.AreEqual("complete", writer.ToString());
        }

        private sealed class TestDataSource : DataSource
        {
            public TestDataSource(TestConnection connection) { Connection = connection; }
            public TestConnection Connection { get; set; }
            public override DataConnection TilesAndFeatures => Connection;
            protected override Task CheckForNewData() => Task.CompletedTask;
        }

        private sealed class TestConnection : DataConnection
        {
            private readonly TaskQueue<ISQLiteAsyncConnection> _queue;
            public TestConnection(SQLiteAsyncConnection database) { _queue = new TaskQueue<ISQLiteAsyncConnection>(database); }
            public override Task<T> Use<T>(EspGisViewer.Util.Action<ISQLiteAsyncConnection, Task<T>> action) => _queue.Request(action);
        }
    }
}