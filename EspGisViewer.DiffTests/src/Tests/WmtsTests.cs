using NUnit.Framework;

namespace EspGisViewer.DiffTests.Tests
{
    [TestFixture]
    public class WmtsTests : DiffTests
    {

        [Test]
        public void TestWmtsCapabilities()
        {
            AssertRequestEquals("/wmts");
            AssertRequestEquals("/wmts/capabilities.xml");
            AssertRequestEquals("/wmts/level1/capabilities.xml");
            AssertRequestEquals("/wmts/definitely_not_a_layer/capabilities.xml");
        }

        [Test]
        public void TestWmtsTiles()
        {
            AssertRequestEquals("/wmts/level1/19/482380/314655.png", new Options
            {
                IsBinary = true
            });
        }
    }
}
