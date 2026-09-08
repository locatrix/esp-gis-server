using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
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
        private SQLiteAsyncConnection _database;
        private string _databasePath;
        private CoverageController _controller;

        [SetUp]
        public async Task SetUp()
        {
            SQLitePCL.Batteries_V2.Init();
            _databasePath = Path.GetTempFileName();
            _database = new SQLiteAsyncConnection(_databasePath);
            await _database.ExecuteAsync("CREATE TABLE all_tiles (tileset TEXT, zoom_level INTEGER, tile_column INTEGER, tile_row INTEGER)");
            await _database.ExecuteAsync("CREATE INDEX idx_all_tiles_coordinate ON all_tiles (zoom_level, tile_column, tile_row, tileset)");
            await _database.ExecuteAsync("CREATE TABLE tileset_metadata (tileset TEXT, display_name TEXT, kind TEXT)");
            await AddTile("category", "Buildings", "category", 4, 3, 5);
            await AddTile("2", "Second floor", "level", 4, 5, 7);
            await AddTile("10", "Tenth floor", "level", 4, 4, 6);
            await AddTile("2", "Second floor", "level", 4, 4, 5);
            await AddTile("west", "Outside west", "name", 4, 2, 5);
            await AddTile("east", "Outside east", "name", 4, 6, 5);
            await AddTile("north", "Outside north", "name", 4, 3, 4);
            await AddTile("south", "Outside south", "name", 4, 3, 8);
            await AddTile("other-zoom", "Other zoom", "name", 5, 3, 5);
            _controller = new CoverageController(new TestDataSource(_database));
        }

        [TearDown]
        public async Task TearDown()
        {
            if (_database != null) await _database.CloseAsync();
            if (_databasePath != null) File.Delete(_databasePath);
        }

        private async Task AddTile(string value, string label, string kind, int zoom, int col, int row)
        {
            await _database.ExecuteAsync("INSERT INTO all_tiles VALUES (?, ?, ?, ?)", value, zoom, col, row);
            await _database.ExecuteAsync("INSERT INTO tileset_metadata VALUES (?, ?, ?)", value, label, kind);
        }

        private async Task<string> Request(string zoom, string minCol, string minRow, string maxCol, string maxRow, int expectedStatus = 200)
        {
            var writer = new StringWriter();
            var context = new HttpContext(new HttpRequest("", "http://localhost/coverage", ""), new HttpResponse(writer));
            await _controller.HandleCoverage(context, new Dictionary<string, string>
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
        public async Task IncludesEdgesAndInteriorAndDeduplicatesInLayerOrder()
        {
            var layers = JArray.Parse(await Request("4", "3", "5", "5", "7"));
            CollectionAssert.AreEqual(new[] { "category", "2", "10" }, layers.Select(layer => (string)layer["value"]));
            Assert.AreEqual("Second floor", (string)layers[1]["label"]);
            Assert.AreEqual("level", (string)layers[1]["kind"]);
        }

        [Test]
        public async Task EqualBoundsQueryOneTile()
        {
            var layers = JArray.Parse(await Request("4", "5", "7", "5", "7"));
            Assert.AreEqual(1, layers.Count);
            Assert.AreEqual("2", (string)layers[0]["value"]);
        }

        [Test]
        public async Task EmptyBoundsReturnEmptyArray()
        {
            Assert.AreEqual("[]", await Request("4", "0", "0", "1", "1"));
            Assert.AreEqual("[]", await Request("0", "0", "0", "0", "0"));
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
        public async Task InvalidBoundsReturnBadRequest(string zoom, string minCol, string minRow, string maxCol, string maxRow)
        {
            // Invalid requests must be rejected without touching the data source.
            _controller = new CoverageController(null);
            var error = JObject.Parse(await Request(zoom, minCol, minRow, maxCol, maxRow, 400));
            Assert.IsNotNull(error["error"]);
        }

        private sealed class TestDataSource : DataSource
        {
            public TestDataSource(SQLiteAsyncConnection database) { TilesAndFeatures = new TestConnection(database); }
            public override DataConnection TilesAndFeatures { get; }
            protected override Task CheckForNewData() => Task.CompletedTask;
        }

        private sealed class TestConnection : DataConnection
        {
            private readonly SQLiteAsyncConnection _database;
            public TestConnection(SQLiteAsyncConnection database) { _database = database; }
            public override Task<T> Use<T>(EspGisViewer.Util.Action<ISQLiteAsyncConnection, Task<T>> action) => action(_database);
        }
    }
}
