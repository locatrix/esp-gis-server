using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using EspGisViewer.Data;
using EspGisViewer.Routes.Coverage;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SQLite;

namespace EspGisViewer.DiffTests.Tests
{
    [TestFixture]
    // The coverage contract differs from the archived Node server, so test it
    // against an isolated SQLite fixture instead of comparing the two servers.
    public class CoverageTests
    {
        private SQLiteConnection _database;
        private string _databasePath;
        private CoverageController _controller;

        [SetUp]
        public void SetUp()
        {
            SQLitePCL.Batteries_V2.Init();
            _databasePath = Path.GetTempFileName();
            _database = new SQLiteConnection(_databasePath);
            _database.Execute("CREATE TABLE all_tiles (tileset TEXT, zoom_level INTEGER, tile_column INTEGER, tile_row INTEGER)");
            _database.Execute("CREATE INDEX idx_all_tiles_coordinate ON all_tiles (zoom_level, tile_column, tile_row, tileset)");
            _database.Execute("CREATE TABLE tileset_metadata (tileset TEXT, display_name TEXT, kind TEXT)");
            AddTile("category", "Buildings", "category", 4, 3, 5);
            AddTile("2", "Second floor", "level", 4, 5, 7);
            AddTile("10", "Tenth floor", "level", 4, 4, 6);
            AddTile("2", "Second floor", "level", 4, 4, 5);
            AddTile("west", "Outside west", "name", 4, 2, 5);
            AddTile("east", "Outside east", "name", 4, 6, 5);
            AddTile("north", "Outside north", "name", 4, 3, 4);
            AddTile("south", "Outside south", "name", 4, 3, 8);
            AddTile("other-zoom", "Other zoom", "name", 5, 3, 5);
            _controller = new CoverageController(new TestDataSource(_database));
        }

        [TearDown]
        public void TearDown()
        {
            if (_database != null) _database.Close();
            if (_databasePath != null) File.Delete(_databasePath);
        }

        private void AddTile(string value, string label, string kind, int zoom, int col, int row)
        {
            _database.Execute("INSERT INTO all_tiles VALUES (?, ?, ?, ?)", value, zoom, col, row);
            _database.Execute("INSERT INTO tileset_metadata VALUES (?, ?, ?)", value, label, kind);
        }

        private string Request(string zoom, string minCol, string minRow, string maxCol, string maxRow, int expectedStatus = 200)
        {
            var writer = new StringWriter();
            var context = new HttpContext(new HttpRequest("", "http://localhost/coverage", ""), new HttpResponse(writer));
            _controller.HandleCoverage(context, new Dictionary<string, string>
            {
                ["tileMatrix"] = zoom,
                ["minTileCol"] = minCol,
                ["minTileRow"] = minRow,
                ["maxTileCol"] = maxCol,
                ["maxTileRow"] = maxRow
            });
            Assert.AreEqual(expectedStatus, context.Response.StatusCode);
            Assert.AreEqual("application/json", context.Response.ContentType);
            return writer.ToString();
        }

        [Test]
        public void IncludesEdgesAndInteriorAndDeduplicatesInLayerOrder()
        {
            var layers = JArray.Parse(Request("4", "3", "5", "5", "7"));
            CollectionAssert.AreEqual(new[] { "category", "2", "10" }, layers.Select(layer => (string)layer["value"]));
            Assert.AreEqual("Second floor", (string)layers[1]["label"]);
            Assert.AreEqual("level", (string)layers[1]["kind"]);
        }

        [Test]
        public void EqualBoundsQueryOneTile()
        {
            var layers = JArray.Parse(Request("4", "5", "7", "5", "7"));
            Assert.AreEqual(1, layers.Count);
            Assert.AreEqual("2", (string)layers[0]["value"]);
        }

        [Test]
        public void EmptyBoundsReturnEmptyArray()
        {
            Assert.AreEqual("[]", Request("4", "0", "0", "1", "1"));
            Assert.AreEqual("[]", Request("0", "0", "0", "0", "0"));
        }

        [TestCase("4", "5", "5", "3", "7")]
        [TestCase("4", "3", "7", "5", "5")]
        [TestCase("4", "-1", "5", "5", "7")]
        [TestCase("4", "3", "-1", "5", "7")]
        [TestCase("4", "3", "5", "16", "7")]
        [TestCase("4", "3", "5", "5", "16")]
        [TestCase("31", "0", "0", "0", "0")]
        [TestCase("-1", "0", "0", "0", "0")]
        [TestCase("abc", "0", "0", "0", "0")]
        [TestCase("4", "1.5", "0", "2", "2")]
        [TestCase("4", "0", "0", "2147483648", "2")]
        public void InvalidBoundsReturnBadRequest(string zoom, string minCol, string minRow, string maxCol, string maxRow)
        {
            // Invalid requests must be rejected without touching the data source.
            _controller = new CoverageController(null);
            var error = JObject.Parse(Request(zoom, minCol, minRow, maxCol, maxRow, 400));
            Assert.IsNotNull(error["error"]);
        }

        private sealed class TestDataSource : DataSource
        {
            public TestDataSource(SQLiteConnection database) { TilesAndFeatures = new TestConnection(database); }
            public override DataConnection TilesAndFeatures { get; }
            protected override void CheckForNewData() { }
        }

        private sealed class TestConnection : DataConnection
        {
            private readonly SQLiteConnection _database;
            public TestConnection(SQLiteConnection database) { _database = database; }
            public override T Use<T>(Func<SQLiteConnection, T> action) => action(_database);
        }
    }
}
