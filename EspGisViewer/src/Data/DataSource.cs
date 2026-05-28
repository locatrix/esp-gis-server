using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
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
        public abstract Task<T> Use<T>(Util.Action<SQLiteAsyncConnection, Task<T>> action);

        /// <summary>
        /// Use this data connection to perform an action without a return value.
        /// </summary>
        /// <param name="action">Action to perform with the connection.</param>
        public Task Use(Util.Action<SQLiteAsyncConnection, Task> action) => Use(async db => { await action(db); return true; });
        public Task<List<T>> QueryAsync<T>(string sql, Dictionary<string, string> parameters = null) where T : new()
        {
            if (parameters == null || parameters.Count == 0)
            {
                return Use(db => db.QueryAsync<T>(sql));
            }

            var rewritten = RewriteNamedParameters(sql, parameters, out var args);
            return Use(db => db.QueryAsync<T>(rewritten, args));
        }

        /// <summary>
        /// Rewrites a SQL string containing <c>$name</c> placeholders into one using
        /// positional <c>?</c> placeholders, producing an ordered argument array created
        /// from <paramref name="parameters"/>.
        /// </summary>
        private static string RewriteNamedParameters(
            string sql,
            IDictionary<string, string> parameters,
            out object[] args)
        {
            var output = new StringBuilder(sql.Length);
            var argList = new List<object>();
            var i = 0;
            var len = sql.Length;

            while (i < len)
            {
                var c = sql[i];

                switch (c)
                {
                    // Single-quoted string literal: copy verbatim, handling '' escapes.
                    case '\'':
                    {
                        output.Append(c);
                        i++;
                        while (i < len)
                        {
                            var sc = sql[i];
                            output.Append(sc);
                            i++;
                            if (sc != '\'') continue;
                            if (i < len && sql[i] == '\'')
                            {
                                output.Append('\'');
                                i++;
                                continue;
                            }
                            break;
                        }
                        continue;
                    }

                    // Line comment: copy through end of line.
                    case '-' when i + 1 < len && sql[i + 1] == '-':
                    {
                        while (i < len && sql[i] != '\n')
                        {
                            output.Append(sql[i]);
                            i++;
                        }
                        continue;
                    }

                    // Block comment: copy through closing */.
                    case '/' when i + 1 < len && sql[i + 1] == '*':
                    {
                        output.Append(sql[i]);
                        output.Append(sql[i + 1]);
                        i += 2;
                        while (i < len)
                        {
                            if (sql[i] == '*' && i + 1 < len && sql[i + 1] == '/')
                            {
                                output.Append('*');
                                output.Append('/');
                                i += 2;
                                break;
                            }
                            output.Append(sql[i]);
                            i++;
                        }
                        continue;
                    }

                    // Candidate $name token: greedy match of [A-Za-z_][A-Za-z0-9_]*.
                    case '$' when i + 1 < len && IsIdentStart(sql[i + 1]):
                    {
                        var start = i;
                        var j = i + 2;
                        while (j < len && IsIdentPart(sql[j]))
                        {
                            j++;
                        }

                        var token = sql.Substring(start, j - start);
                        if (parameters.TryGetValue(token, out var value))
                        {
                            output.Append('?');
                            argList.Add(value);
                        }
                        else
                        {
                            output.Append(token);
                        }
                        i = j;
                        continue;
                    }

                    default:
                        output.Append(c);
                        i++;
                        break;
                }
            }

            args = argList.ToArray();
            return output.ToString();
        }

        private static bool IsIdentStart(char c) =>
            (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c == '_';

        private static bool IsIdentPart(char c) =>
            IsIdentStart(c) || (c >= '0' && c <= '9');
    }
}
