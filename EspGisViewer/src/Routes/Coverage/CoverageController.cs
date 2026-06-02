using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using EspGisViewer.Data;
using Newtonsoft.Json;

namespace EspGisViewer.Routes.Coverage
{
    public class LayerLevelRow
    {
        [SQLite.Column("layer_level")]
        public string LayerLevel { get; set; }

        [SQLite.Column("display_name")]
        public string DisplayName { get; set; }

        [SQLite.Column("kind")]
        public string Kind { get; set; }
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
        private static readonly HashSet<string> AllowedKinds =
            new HashSet<string>(StringComparer.Ordinal) { "category", "level", "name" };

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
                SELECT DISTINCT t.tileset as layer_level, m.display_name as display_name, m.kind as kind
                FROM all_tiles t
                LEFT JOIN tileset_metadata m ON m.tileset = t.tileset
                WHERE t.zoom_level = $zoom AND t.tile_column = $x AND t.tile_row = $y
                ", parameters2);
            }
            catch (Exception e)
            {
                Console.WriteLine($"{e.Message}\n{e.StackTrace}");
                return;
            }

            var rows = levels.GroupBy(r => r.LayerLevel).Select(g => g.First()).ToList();

            var sorter = new LayerSorter();
            rows.Sort((a, b) => sorter.Compare(a.LayerLevel, b.LayerLevel));

            var json = JsonConvert.SerializeObject(rows.Select(r =>
            {
                if (r.DisplayName != null && string.IsNullOrWhiteSpace(r.DisplayName))
                {
                    throw new InvalidOperationException(
                        $"tileset_metadata.display_name for tileset '{r.LayerLevel}' is blank; expected NULL or a non-empty value.");
                }

                if (!AllowedKinds.Contains(r.Kind))
                {
                    throw new InvalidOperationException(
                        $"tileset_metadata.kind for tileset '{r.LayerLevel}' is '{r.Kind}'; expected one of: category, level, name.");
                }

                return new
                {
                    value = r.LayerLevel,
                    label = r.DisplayName ?? r.LayerLevel,
                    kind = r.Kind
                };
            }));

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
