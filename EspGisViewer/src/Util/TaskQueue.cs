using System;
namespace EspGisViewer.Util
{
    public class TaskQueue<T>
    {

        private T _value;
        private readonly object _sync = new object();

        public TaskQueue(T initialValue)
        {
            _value  = initialValue;
        }

        /// <summary>
        /// Requests the queue's value, with the value being passed to the provided
        /// `func` callback. The value is held exclusively until the callback returns.
        /// </summary>
        ///
        /// <param name="func">The function to execute.</param>
        /// <returns>The callback's result.</returns>
        public TR Request<TR>(Func<T, TR> func)
        {
            lock (_sync)
            {
                return func(_value);
            }
        }

    }

    public delegate TR Action<in TI, out TR>(TI arg);
}
