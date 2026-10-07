using System;
using System.Threading;
using System.Threading.Tasks;
namespace EspGisViewer.Util
{
    public class TaskQueue<T>
    {

        private T _value;
        private readonly SemaphoreSlim _semaphore = new SemaphoreSlim(1, 1);

        public TaskQueue(T initialValue)
        {
            _value  = initialValue;
        }

        /// <summary>
        /// Requests the queue's value, with the value being passed to the provided
        /// `func` callback. The callback must return a task that resolves to the
        /// queue's value, signalling that it is safe for the value to be used by
        /// other requests.
        /// </summary>
        ///
        /// <param name="func">The function to execute.</param>
        /// <returns>A task that resolves once the function has been called.</returns>
        public async Task<TR> Request<TR>(Action<T, Task<TR>> func)
        {
            await _semaphore.WaitAsync();
            try
            {
                return await func(_value);
            }
            finally
            {
                _semaphore.Release();
            }
        }

    }

    public delegate TR Action<in TI, out TR>(TI arg);
}
