using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Web;

namespace EspGisViewer.Routes.Wfs
{
    public struct WfsParams
    {
        public string[] TypeNames { get; set; }
        public double[] Bbox { get; set; }
        public string OutputFormat { get; set; }
        public int? Count { get; set; }
        public string SrsName { get; set; }

        public static WfsParams? Parse(HttpRequest request, HttpResponse response, Dictionary<string, string> overrideQueries = null)
        {
            var queries = HttpUtility.ParseQueryString(request.Url.Query);

            if (overrideQueries != null)
            {
                foreach (var overrideQuery in overrideQueries)
                {
                    queries[overrideQuery.Key] = overrideQuery.Value;
                }
            }

            var typeNamesList = new List<string>();
            var typeNamesParam = queries.Get("typenames");
            if (!string.IsNullOrEmpty(typeNamesParam))
            {
                var normalizedTypenames = typeNamesParam.Trim();
                typeNamesList.AddRange(normalizedTypenames.Contains(',') ?
                                       normalizedTypenames.Split(',') :
                                       new[] { normalizedTypenames });
            }
            else
            {
                var typeNameParam = queries.Get("typename");
                if (!string.IsNullOrEmpty(typeNameParam))
                {
                    // normalizeQueryParam equivalent: simple Trim
                    typeNamesList.Add(typeNameParam.Trim());
                }
            }

            var finalTypeNames = typeNamesList
                .Select(tn => tn.Trim()) // Trim each part
                .Select(tn =>
                {
                    // ESRI likes to include a colon for a global namespace, which we need to omit
                    if (tn.StartsWith(":"))
                    {
                        return tn.Substring(1);
                    }
                    return tn;
                })
                .Where(tn => !string.IsNullOrEmpty(tn)) // Remove any empty strings that might result from split or initial empty values
                .ToArray();

            if (finalTypeNames.Length == 0)
            {
                finalTypeNames = new[] { "plans" }; // Default to "plans" if no typenames provided
            }

            // --- Bbox ---
            double[] bbox = null;
            var bboxParam = queries.Get("bbox");
            if (!string.IsNullOrEmpty(bboxParam))
            {
                // normalizeQueryParam equivalent: simple Trim
                var normalizedBbox = bboxParam.Trim();
                if (!normalizedBbox.Contains(','))
                {
                    response.StatusCode = 400;
                    response.ContentType = "text/plain";
                    response.Write("Invalid bbox parameter: missing comma separators");
                    return null;
                }

                var bboxPartsList = normalizedBbox.Split(',').Select(p => p.Trim()).ToList();

                if (bboxPartsList.Count == 5)
                {
                    // WFS 1.1.0 allows a 5th parameter for CRS, WFS 2.0.0 may have more complex rules
                    if (!"urn:ogc:def:crs:EPSG::3857".Equals(bboxPartsList[4], StringComparison.OrdinalIgnoreCase))
                    {
                        response.StatusCode = 400;
                        response.ContentType = "text/plain";
                        response.Write("Unsupported bbox CRS. Only urn:ogc:def:crs:EPSG::3857 allowed for 5-part bbox.");
                        return null;
                    }
                    bboxPartsList.RemoveAt(4); // Remove the CRS part
                }

                if (bboxPartsList.Count != 4)
                {
                    response.StatusCode = 400;
                    response.ContentType = "text/plain";
                    response.Write("Invalid bbox parameter: must have 4 coordinate values (or 5 with supported CRS).");
                    return null;
                }

                bbox = new double[4];
                for (var i = 0; i < bboxPartsList.Count; i++)
                {
                    if (!double.TryParse(bboxPartsList[i], NumberStyles.Any, CultureInfo.InvariantCulture, out bbox[i]))
                    {
                        response.StatusCode = 400;
                        response.ContentType = "text/plain";
                        response.Write("Invalid bbox parameter: unable to parse numeric value.");
                        return null;
                    }

                }

                // The JS checks for NaN separately. double.TryParse should handle "NaN" string by returning false.
                // This check is for values that might become NaN through calculation, which is not the case here,
                // but for strict adherence to the JS:
                if (bbox.Any(double.IsNaN))
                {
                    response.StatusCode = 400;
                    response.ContentType = "text/plain";
                    response.Write("Invalid bbox parameter: contains NaN value.");
                    return null;
                }
            }

            // --- OutputFormat ---
            string outputFormat = null;
            var outputFormatParam = queries.Get("outputformat");
            if (!string.IsNullOrEmpty(outputFormatParam))
            {
                // normalizeQueryParam is not explicitly used here in JS, but direct assignment. Assume Trim.
                outputFormat = outputFormatParam.Trim();

                // WFS parameter values are typically case-insensitive. JS used 'GEOJSON'.
                if (!"GEOJSON".Equals(outputFormat, StringComparison.OrdinalIgnoreCase))
                {
                    response.StatusCode = 400;
                    response.ContentType = "text/plain";
                    response.Write("Invalid outputformat. Only GEOJSON is supported.");
                    return null;
                }
                outputFormat = "GEOJSON"; // Canonical form
            }

            // --- Count ---
            int? count = null;
            var countParam = queries.Get("count");
            if (!string.IsNullOrEmpty(countParam))
            {
                if (!int.TryParse(countParam.Trim(), out var parsedCount) || parsedCount < 0)
                {
                    response.StatusCode = 400;
                    response.ContentType = "text/plain";
                    response.Write("Invalid count");
                    return null;
                }
                count = parsedCount;
            }

            // --- SrsName ---
            var srsName = "EPSG:3857"; // Default SRS
            var srsNameParam = queries.Get("srsname");
            if (!string.IsNullOrEmpty(srsNameParam))
            {
                // normalizeQueryParam equivalent: simple Trim
                var normalizedSrsName = srsNameParam.Trim();

                // Normalize SRS's and ensure they're supported
                // Using OrdinalIgnoreCase for robustness, as SRS codes can vary in casing.
                switch (normalizedSrsName.ToUpperInvariant()) // Convert to upper for case-insensitive comparison
                {
                    case "EPSG:102100":
                    case "URN:OGC:DEF:CRS:EPSG::102100":
                    case "EPSG:3857": // Already default, but good to handle explicitly
                    case "URN:OGC:DEF:CRS:EPSG::3857":
                        srsName = "EPSG:3857";
                        break;
                    case "EPSG:4326":
                    case "URN:OGC:DEF:CRS:EPSG::4326":
                        srsName = "EPSG:4326";
                        break;
                    default:
                        var message = $"Unsupported SRS: {normalizedSrsName}";
                        response.StatusCode = 400;
                        response.ContentType = "text/plain";
                        response.Write(message);
                        return null;
                }
            }

            return new WfsParams
            {
                TypeNames = finalTypeNames,
                Bbox = bbox,
                OutputFormat = outputFormat,
                Count = count,
                SrsName = srsName
            };
        }
    }
}
