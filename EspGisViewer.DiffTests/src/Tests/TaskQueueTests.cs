using System.Threading.Tasks;
using EspGisViewer.Util;
using NUnit.Framework;

namespace EspGisViewer.DiffTests.Tests
{
    [TestFixture]
    public class TaskQueueTests
    {
        [Test]
        public async Task ConcurrentRequestsAreSerialized()
        {
            var queue = new TaskQueue<int>(42);
            var firstRequestEntered = new TaskCompletionSource<bool>();
            var releaseFirstRequest = new TaskCompletionSource<bool>();
            var secondRequestEntered = new TaskCompletionSource<bool>();

            var firstRequest = queue.Request(async value =>
            {
                firstRequestEntered.TrySetResult(true);
                await releaseFirstRequest.Task;
                return value;
            });

            await firstRequestEntered.Task;

            var secondRequest = queue.Request(value =>
            {
                secondRequestEntered.TrySetResult(true);
                return Task.FromResult(value);
            });

            var completedTask = await Task.WhenAny(secondRequestEntered.Task, Task.Delay(1000));
            var secondStartedBeforeFirstCompleted = completedTask == secondRequestEntered.Task;

            releaseFirstRequest.TrySetResult(true);
            await Task.WhenAll(firstRequest, secondRequest);

            Assert.IsFalse(secondStartedBeforeFirstCompleted, "The second request entered while the first request still held the queue.");
        }
    }
}