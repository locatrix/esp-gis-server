using System;
using System.Threading.Tasks;
namespace EspGisViewer.Util
{
    public class TaskQueue<T>
    {

        private T _value;
        private Task _currentTask;

        public TaskQueue(T initialValue)
        {
            _value  = initialValue;
            _currentTask = Task.CompletedTask;
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
            var result = default(TR);
            _currentTask = await _currentTask.ContinueWith(async (t) =>
            {
                result = await func(_value);
            });

            await _currentTask;
            return result;
        }

    }

    public delegate TR Action<in TI, out TR>(TI arg);
}
