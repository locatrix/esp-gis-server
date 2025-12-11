using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web.Configuration;
using SQLite;
namespace EspGisViewer.Data
{
    public abstract class DataSource
    {
        /// <summary>
        /// Gets the data source from the environment.
        /// </summary>
        public static DataSource GetDataSource()
        {
            return new FileSystemDataSource();
        }

        private const int CheckIntervalSeconds = 300; // 5 minutes

        private readonly object _refreshLock = new object();
        private bool _isRefreshing = false;

        /// <summary>
        /// Gets the last time the data source was refreshed.
        /// Returns DateTime.MinValue if never refreshed.
        /// </summary>
        private DateTime LastRefreshTime
        {
            get;
            set;
        } = DateTime.MinValue;

        /// <summary>
        /// Refreshes the data source's data, ensuring that it has a chance to look
        /// for more up-to-date data.
        /// This implementation is synchronous.
        /// </summary>
        /// <param name="force">Whether to force a check for new data. If false,
        /// checks will occur based on CHECK_INTERVAL_SECONDS.</param>
        public async Task Refresh(bool force)
        {
            var performRefresh = false;

            lock (_refreshLock)
            {
                if (_isRefreshing)
                {
                    return;
                }

                var timeSinceLastRefresh = DateTime.UtcNow - LastRefreshTime;

                if (force || timeSinceLastRefresh.TotalSeconds > CheckIntervalSeconds)
                {
                    LastRefreshTime = DateTime.UtcNow;
                    _isRefreshing = true;
                    performRefresh = true;
                }
            }

            if (!performRefresh)
            {
                return;
            }

            try
            {
                await CheckForNewData();
            }
            finally
            {
                lock (_refreshLock)
                {
                    _isRefreshing = false;
                }
            }
        }

        /// <summary>
        /// To be implemented by subclasses. Called by <see cref="Refresh"/> to check for new
        /// data. This method is expected to perform its work synchronously in this .NET 2.0 context.
        /// </summary>
        protected abstract Task CheckForNewData();

        public abstract DataConnection Tiles { get; }
    }

    public abstract class DataConnection
    {
        /// <summary>
        /// Use this data connection to perform an action.
        /// </summary>
        /// <param name="action">Action to perform with the connection.</param>
        /// <typeparam name="T">Return type of the action.</typeparam>
        /// <returns>Result of the action.</returns>
        public abstract Task<T> Use<T>(Util.Action<SQLiteAsyncConnection, Task<T>> action);

        /// <summary>
        /// Use this data connection to perform an action without a return value.
        /// </summary>
        /// <param name="action">Action to perform with the connection.</param>
        public Task Use(Util.Action<SQLiteAsyncConnection, Task> action) => Use(async db => { await action(db); return true; });
        public Task<List<T>> QueryAsync<T>(string sql, Dictionary<string, string> parameters = null) where T : new()
        {
            // TODO: Get parameterized queries working
            // for now, just do a string replace
            if (parameters != null)
            {
                sql = parameters.Aggregate(sql, (current, entry) => current.Replace(entry.Key, $"\"{entry.Value}\""));
            }
            
            return Use(db => db.QueryAsync<T>(sql));
        }
    }
}
