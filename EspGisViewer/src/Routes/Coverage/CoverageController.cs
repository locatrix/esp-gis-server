using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;
using EspGisViewer.Data;
using EspGisViewer.Util;

namespace EspGisViewer.Routes.Coverage
{
    public class LayerLevelRow
    {
        [SQLite.Column("layer_level")]
        public string LayerLevel { get; set; }
    }

    public class SqliteMaster
    {
        [SQLite.Column("type")]
        public string Type { get; set; }

        [SQLite.Column("name")]
        public string Name { get; set; }
    }

    public class TilesetLevel
    {
        [SQLite.Column("tileset")]
        public string LayerName { get; set; }

        [SQLite.Column("layer_level")]
        public string DisplayName { get; set; }
    }

    public class CoverageController
    {
        private readonly DataSource _dataSource;

        public CoverageController(DataSource dataSource)
        {
            _dataSource = dataSource;
        }

        // /coverage/{tileMatrix}/{tileCol}/{tileRow}
        public async Task HandleCoverage(HttpContext context, Dictionary<string, string> parameters)
        {
            await _dataSource.Refresh(false);

            var tileMatrix = parameters["tileMatrix"];
            var tileCol = parameters["tileCol"];
            var tileRow = parameters["tileRow"];

            // Ensure all are ints
            _ = int.Parse(tileMatrix);
            _ = int.Parse(tileCol);
            _ = int.Parse(tileRow);

            var parameters2 = new Dictionary<string, string>
            {
                { "$zoom", tileMatrix },
                { "$x", tileCol },
                { "$y", tileRow }
            };
            List<LayerLevelRow> levels;

            try
            {
                levels = await _dataSource.TilesAndFeatures.QueryAsync<LayerLevelRow>(@"
                SELECT DISTINCT tileset as layer_level
                FROM all_tiles  
                WHERE zoom_level = $zoom AND tile_column = $x AND tile_row = $y
                ", parameters2);
            }
            catch (Exception e)
            {
                Console.WriteLine($"{e.Message}\n{e.StackTrace}");
                return;
            }

            var rows = levels.ConvertAll(t => t.LayerLevel).Distinct().ToList();

            rows.Sort(new LayerSorter());

            var json = $"[{string.Join(",", rows.ConvertAll(r => $"\"{r}\""))}]";

            context.Response.StatusCode = 200;
            context.Response.ContentType = "application/json";

            context.Response.Write(json);
        }

        private class LayerSorter : IComparer<string>
        {
            public int Compare(string x, string y)
            {
                // try convert to double
                if (double.TryParse(x, out var xDouble) && double.TryParse(y, out var yDouble))
                {
                    return xDouble.CompareTo(yDouble);
                }

                // prefer string layers first
                if (double.TryParse(x, out _))
                {
                    return 1;
                }
                if (double.TryParse(y, out _))
                {
                    return -1; // y is numeric, x is not
                }

                // if both are non-numeric, compare as strings
                return string.Compare(x, y, StringComparison.OrdinalIgnoreCase);
            }
        }
    }
}
