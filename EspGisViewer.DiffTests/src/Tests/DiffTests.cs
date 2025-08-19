using System;
using System.IO;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using NUnit.Framework;

namespace EspGisViewer.DiffTests.Tests
{
    public abstract class DiffTests
    {

        static DiffTests()
        {
            MakeSureIsRunning(3000, "esp-gis-server");
            MakeSureIsRunning(62836, "EspGisViewer");
        }

        private static void MakeSureIsRunning(int port, string name)
        {
            try
            {
                var request = WebRequest.CreateHttp($"http://localhost:{port}/");
                var response = (HttpWebResponse) request.GetResponse();

                if (response.StatusCode == HttpStatusCode.OK)
                {
                    Console.WriteLine($"{name} is running on port {port}");
                }
            }
            catch (Exception)
            {
                throw new Exception($"Couldn't connect to {name} on port {port}. Is it running? (You need to run it yourself)");
            }
        }

        private static readonly Regex XmlSqMtRegex = new Regex(@"<squareMeters>(\d+)</squareMeters>", RegexOptions.Compiled);
        private static readonly Regex JsonSqMtRegex = new Regex(@"""squareMeters"": ""(\d+)"",", RegexOptions.Compiled);
        private static readonly Regex FloatRegex = new Regex(@"(\d+\.\d\d)(\d+)", RegexOptions.Compiled);
        private static readonly Regex HostRegex = new Regex(@"http[:][/][/]localhost[:]\d+", RegexOptions.Compiled);

        public class Body
        {
            public string ContentType { get; set; }
            public byte[] Bytes { get; set; }
        }

        public class Options
        {
            public string Method { get; set; } = "GET";
            public Body Body { get; set; } = null;
            public bool IsBinary { get; set; } = false;
            public Action<WebRequest> Config { get; set; } = null;
        }

        /// <summary>
        /// Runs the given request for both the server and viewer, and compares the results.
        /// </summary>
        /// <param name="path">The path for the url. e.g. "/wmts"</param>
        /// <param name="isBinary">Whether the response is binary or not. If true, the byte arrays are compared directly. If false, they are converted to strings and compared.</param>
        /// <param name="config">Optional config function to modify the request before sending.</param>
        /// <returns>The response from the server.</returns>
        protected static byte[] AssertRequestEquals(string path, Options options = null)
        {
            if (options == null)
            {
                options = new Options();
            }

            const string serverUrl = "http://localhost:3000";
            const string viewerUrl = "http://localhost:62836";

            var serverRequest = WebRequest.CreateHttp(serverUrl + path);
            var viewerRequest = WebRequest.CreateHttp(viewerUrl + path);

            serverRequest.Method = options.Method;
            viewerRequest.Method = options.Method;

            serverRequest.Timeout = 10000;
            viewerRequest.Timeout = 10000;

            if (options.Body != null)
            {
                serverRequest.ContentType = options.Body.ContentType;
                viewerRequest.ContentType = options.Body.ContentType;

                serverRequest.ContentLength = options.Body.Bytes.Length;
                viewerRequest.ContentLength = options.Body.Bytes.Length;

                using (var stream = serverRequest.GetRequestStream())
                {
                    stream.Write(options.Body.Bytes, 0, options.Body.Bytes.Length);
                }

                using (var stream = viewerRequest.GetRequestStream())
                {
                    stream.Write(options.Body.Bytes, 0, options.Body.Bytes.Length);
                }
            }

            if (options.Config != null)
            {
                options.Config(serverRequest);
                options.Config(viewerRequest);
            }

            HttpWebResponse serverResponse;
            HttpWebResponse viewerResponse;

            try
            {
                serverResponse = (HttpWebResponse)serverRequest.GetResponse();
            }
            catch (WebException ex)
            {
                // An exception is thrown if the server returns a non-200 status code, which is expected for our tests.
                serverResponse = (HttpWebResponse) ex.Response;
            }

            try
            {
                viewerResponse = (HttpWebResponse) viewerRequest.GetResponse();
            }
            catch (WebException ex)
            {
                // An exception is thrown if the server returns a non-200 status code, which is expected for our tests.
                viewerResponse = (HttpWebResponse) ex.Response;
            }

            if (serverResponse == null)
            {
                Assert.Fail("Server response is null, likely timeout");
            }

            if (viewerResponse == null)
            {
                Assert.Fail("Viewer response is null, likely timeout");
            }

            var serverContentType = serverResponse.ContentType;
            if (serverResponse.ContentType.EndsWith("; charset=utf-8"))
            {
                serverContentType = serverResponse.ContentType.Substring(0, serverResponse.ContentType.Length - "; charset=utf-8".Length);
            }

            var viewerContentType = viewerResponse.ContentType;
            if (viewerResponse.ContentType.EndsWith("; charset=utf-8"))
            {
                viewerContentType = viewerResponse.ContentType.Substring(0, viewerResponse.ContentType.Length - "; charset=utf-8".Length);
            }

            Assert.AreEqual(serverResponse.StatusCode, viewerResponse.StatusCode, $"Response codes do not match for {path}");
            Assert.AreEqual(serverContentType, viewerContentType, $"Content types do not match for {path}");

            byte[] serverBytes;
            using (var mem = new MemoryStream())
            {
                var responseStream = serverResponse.GetResponseStream();

                if (responseStream == null)
                {
                    Assert.Fail("Viewer response stream is null");
                }

                responseStream.CopyTo(mem);
                serverBytes = mem.ToArray();
            }

            byte[] viewerBytes;
            using (var mem = new MemoryStream())
            {
                var responseStream = viewerResponse.GetResponseStream();

                if (responseStream == null)
                {
                    Assert.Fail("Server response stream is null");
                }

                responseStream.CopyTo(mem);
                viewerBytes = mem.ToArray();
            }

            if (options.IsBinary)
            {
                Assert.AreEqual(serverBytes.Length, viewerBytes.Length, $"Response lengths do not match for {path}");
                Assert.AreEqual(serverBytes, viewerBytes, $"Response bodies do not match for {path}");
            }
            else
            {
                // convert to strings
                var serverString = Encoding.UTF8.GetString(serverBytes);
                var viewerString = Encoding.UTF8.GetString(viewerBytes);

                // There are some expected differences we need to account for.

                // Fix line endings
                // TODO: Find a way to do this in the esp-gis-server code instead. It's a current bug with that codebase.
                serverString = serverString.Replace("\n", "\r\n");
                serverString = serverString.Replace("\r\r", "\r");

                if (serverResponse.ContentType.StartsWith("text/xml"))
                {
                    // escape relevant xml
                    // TODO: Find a way to do this in the esp-gis-server code instead. It's a current bug with that codebase.
                    serverString = serverString.Replace("'", "&apos;");
                    viewerString = viewerString.Replace("&quot;", "\"");

                    // add trailing zero to square meters
                    serverString = XmlSqMtRegex.Replace(serverString, "<squareMeters>$1.0</squareMeters>");
                }

                if (serverResponse.ContentType.StartsWith("application/json"))
                {
                    // add trailing zero to square meters
                    serverString = JsonSqMtRegex.Replace(serverString, "\"squareMeters\": \"$1.0\",");
                }

                // anonymise url ports
                serverString = HostRegex.Replace(serverString, "http://localhost");
                viewerString = HostRegex.Replace(viewerString, "http://localhost");

                // strip floats down to 2 decimal places
                serverString = FloatRegex.Replace(serverString, "$1");
                viewerString = FloatRegex.Replace(viewerString, "$1");

                Assert.AreEqual(serverString, viewerString, $"Response bodies do not match for {path}");
            }

            return serverBytes;
        }
    }
}
