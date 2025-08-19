using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;
using EspGisViewer.Data;
using EspGisViewer.Util;
namespace EspGisViewer.Routes.Wmts
{
    public class TileData
    {
        [SQLite.Column("tile_data")]
        public byte[] Data { get; set; }
    }

    public class Tile
    {
        [SQLite.Column("id")]
        public int Id { get; set; }

        [SQLite.Column("tileset")]
        public string Tileset { get; set; }

        [SQLite.Column("zoom_level")]
        public int ZoomLevel { get; set; }

        [SQLite.Column("tile_column")]
        public int TileColumn { get; set; }

        [SQLite.Column("tile_row")]
        public int TileRow { get; set; }

        [SQLite.Column("tile_data")]
        public byte[] TileData { get; set; }

        [SQLite.Column("layer_level")]
        public string LayerLevel { get; set; }
    }

    public class WmtsTileController
    {
        private readonly DataSource _dataSource;
        private readonly DataConnection _dataConnection;

        public WmtsTileController(DataSource dataSource, DataConnection dataConnection)
        {
            _dataSource = dataSource;
            _dataConnection = dataConnection;
        }

        // /wmts/{tiles}/{tileZoom}/{tileCol}/{tileRow}.png
        public async Task HandleTile(HttpContext context, Dictionary<string, string> parameters)
        {
            await _dataSource.Refresh(false);

            var layer = parameters["tiles"];
            var tileZoom = parameters["tileZoom"];
            var tileCol = parameters["tileCol"];
            var tileRow = parameters["tileRow"];

            // we only support PNG tiles
            if (!tileRow.EndsWith(".png"))
            {
                context.Response.StatusCode = 400;
                context.Response.ContentType = "text/plain";

                context.Response.Write("Tile row must end with .png");
                return;
            }
            tileRow = tileRow.Substring(0, tileRow.Length - ".png".Length);

            // sanitize all parameters
            var nameRegex = new Regex("^[a-zA-Z0-9_.-]+$");
            var numberRegex = new Regex("^[0-9]+$");

            if (
                !nameRegex.IsMatch(layer) ||
                !numberRegex.IsMatch(tileZoom) ||
                !numberRegex.IsMatch(tileCol) ||
                !numberRegex.IsMatch(tileRow))
            {
                context.Response.StatusCode = 400;
                context.Response.ContentType = "text/plain";

                context.Response.Write("Invalid parameters");
                return;
            }

            var rows = await _dataConnection.QueryAsync<Tile>($@"SELECT *
                  FROM all_tiles
                  WHERE tileset = '{layer}'
                  AND zoom_level = {tileZoom}
                  AND tile_column = {tileCol}
                  AND tile_row = {tileRow}");

            if (rows.Count > 0)
            {
                var overlappedImages = Images.OverlapImages(rows.ConvertAll(tile => tile.TileData));
                context.Response.StatusCode = 200;
                context.Response.ContentType = "image/png";
                context.Response.BinaryWrite(overlappedImages);
            }
            else
            {
                context.Response.StatusCode = 200;
                context.Response.ContentType = "image/gif";

                context.Response.BinaryWrite(Images.TransparentImage);
            }
        }
    }
}
