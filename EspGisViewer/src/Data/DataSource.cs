using System;
using System.Collections.Generic;
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
        public void Refresh(bool force)
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
                CheckForNewData();
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
        protected abstract void CheckForNewData();

        public abstract DataConnection TilesAndFeatures { get; }
    }

    public abstract class DataConnection
    {
        /// <summary>
        /// Use this data connection to perform an action.
        /// </summary>
        /// <param name="action">Action to perform with the connection.</param>
        /// <typeparam name="T">Return type of the action.</typeparam>
        /// <returns>Result of the action.</returns>
        public abstract T Use<T>(Func<SQLiteConnection, T> action);

        /// <summary>
        /// Use this data connection to perform an action without a return value.
        /// </summary>
        /// <param name="action">Action to perform with the connection.</param>
        public void Use(Action<SQLiteConnection> action) => Use(db => { action(db); return true; });
        public List<T> Query<T>(string sql, params object[] args) where T : new()
        {
            if (args == null || args.Length == 0)
            {
                return Use(db => db.Query<T>(sql));
            }

            return Use(db => db.Query<T>(sql, args));
        }
    }
}
