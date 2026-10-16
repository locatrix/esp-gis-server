using System.Threading;
using System.Threading.Tasks;
using EspGisViewer.Util;
using NUnit.Framework;

namespace EspGisViewer.DiffTests.Tests
{
    [TestFixture]
    public class TaskQueueTests
    {
        [Test]
        public void ConcurrentRequestsAreSerialized()
        {
            var queue = new TaskQueue<int>(42);
            using (var firstRequestEntered = new ManualResetEventSlim())
            using (var releaseFirstRequest = new ManualResetEventSlim())
            using (var secondRequestAttempted = new ManualResetEventSlim())
            using (var secondRequestEntered = new ManualResetEventSlim())
            {
                var firstRequest = Task.Run(() => queue.Request(value =>
                {
                    firstRequestEntered.Set();
                    Assert.IsTrue(releaseFirstRequest.Wait(5000));
                    return value;
                }));
                Task<int> secondRequest = null;
                try
                {
                    Assert.IsTrue(firstRequestEntered.Wait(5000));
                    secondRequest = Task.Run(() =>
                    {
                        secondRequestAttempted.Set();
                        return queue.Request(value =>
                        {
                            secondRequestEntered.Set();
                            return value;
                        });
                    });
                    Assert.IsTrue(secondRequestAttempted.Wait(5000));
                    Assert.IsFalse(secondRequestEntered.Wait(1000), "The second request entered while the first request still held the queue.");
                }
                finally
                {
                    releaseFirstRequest.Set();
                    Assert.IsTrue(firstRequest.Wait(5000));
                    if (secondRequest != null) Assert.IsTrue(secondRequest.Wait(5000));
                }
                Assert.AreEqual(42, secondRequest.Result);
            }
        }
    }
}