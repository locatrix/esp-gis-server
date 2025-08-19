using NUnit.Framework;

namespace EspGisViewer.DiffTests.Tests
{
    [TestFixture]
    public class CoverageTests : DiffTests
    {

        [Test]
        public void TestWmtsCapabilities()
        {
            AssertRequestEquals("/coverage/18/241075/157291");
        }
    }
}
