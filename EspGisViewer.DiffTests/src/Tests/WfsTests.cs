using System.Text;
using NUnit.Framework;

namespace EspGisViewer.DiffTests.Tests
{
    [TestFixture]
    public class WfsTests : DiffTests
    {

        [Test]
        public void TestWfsGetFeature()
        {
            AssertRequestEquals("/wfs?request=GetFeature&typeName=plans");

            // AssertRequestEquals("/wfs?request=GetFeature");
//             AssertRequestEquals("/wfs?request=GetCapabilities", new Options
//             {
//                 Method = "POST",
//                 Body =
//                 {
//                     ContentType = "application/xml",
//                     Bytes = Encoding.UTF8.GetBytes(@"<?xml version=""1.0"" encoding=""UTF-8""?>
// <wfs:GetFeature xmlns:wfs=""http://www.opengis.net/wfs/2.0"" count=""25"" service=""WFS"" version=""2.0.0"">
//   <wfs:Query typeNames=""ns56:plans""/>
// </wfs:GetFeature>")
//                 }
//             });
        }

        [Test]
        public void TestWfsGetCapabilities()
        {
            AssertRequestEquals("/wfs?request=GetCapabilities");

 //            AssertRequestEquals("/wfs?request=GetCapabilities", new Options
 //            {
 //                Method = "POST",
 //                Body = new Body {
 //                    ContentType = "application/xml",
 //                    Bytes = Encoding.UTF8.GetBytes(@"<GetCapabilities
 // service=""WFS""
 // xmlns=""http://www.opengis.net/wfs""
 // xmlns:xsi=""http://www.w3.org/2001/XMLSchema-instance""
 // xsi:schemaLocation=""http://www.opengis.net/wfs
 // http://schemas.opengis.net/wfs/1.1.0/wfs.xsd""/>")
 //                }
 //            });
        }

        [Test]
        public void TestWfsDescribeFeatureType()
        {
            AssertRequestEquals("/wfs?request=DescribeFeatureType&typeName=plans");

            // AssertRequestEquals("/wfs?request=DescribeFeatureType");
        }
    }
}
