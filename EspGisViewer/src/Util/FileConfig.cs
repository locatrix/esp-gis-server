using System.Text.RegularExpressions;

namespace EspGisViewer.Util
{
    public static class FileConfig
    {
        // files like espqld-tiles-20231115.gpkg are valid. (YYYYMMDD)
        // any leading prefix is also fine (so, "foo bar baz-tiles-20231115.gpkg"
        // would be valid).
        public static readonly Regex TilesFileRegex = new Regex(@"^[^\.]+-tiles-\d{8}\.gpkg$", RegexOptions.Compiled);
    }
}
