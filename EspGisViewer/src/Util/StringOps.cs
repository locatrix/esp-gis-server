using System;
namespace EspGisViewer.Util
{
    public class StringOps
    {
        public static bool SplitNamespace(string input, out string namespacePart, out string namePart)
        {
            if (input == null)
            {
                namespacePart = null;
                namePart = null;
                return false;
            }

            var parts = input.Split(':');
            if (parts.Length == 2)
            {
                namespacePart = parts[0];
                namePart = parts[1];
                return true;
            }

            namespacePart = null;
            namePart = input;
            return false;
        }

        public static string ReplaceFirstOccurrence(string source, string find, string replace)
        {
            var place = source.IndexOf(find, StringComparison.Ordinal);

            return place == -1 ? source : source.Remove(place, find.Length).Insert(place, replace);

        }
    }
}
