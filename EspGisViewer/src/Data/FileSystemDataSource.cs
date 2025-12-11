using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using System.Web.Configuration;
using System.Web.Script.Serialization;
using EspGisViewer.Util;
using SQLite;
namespace EspGisViewer.Data
{
    public sealed class FileSystemDataSource : DataSource
    {

        private readonly string _packagePath;

        private TaskQueue<SQLiteAsyncConnection> _tilesDbQueue;

        public FileSystemDataSource()
        {
            var absOrRelPath = WebConfigurationManager.AppSettings.Get("EspGeopackagesPath") ?? ".";
            // convert abs or rel path to absolute path
            if (!Path.IsPathRooted(absOrRelPath))
            {
                absOrRelPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, absOrRelPath);
            }
            _packagePath = absOrRelPath;

            try
            {
                var pathStats = File.GetAttributes(_packagePath);
                if (!pathStats.HasFlag(FileAttributes.Directory))
                {
                    throw new Exception($"the path pointed to by EspGeopackagesPath ({_packagePath}) is not a directory");
                }
            }
            catch (FileNotFoundException)
            {
                throw new Exception($"the path pointed to by EspGeopackagesPath ({_packagePath}) does not exist");
            }

            CheckForNewData().Wait();
        }
        
        private FileSystemDataConnection _tiles;
        public override DataConnection Tiles
        {
            get => _tiles ?? throw new InvalidOperationException("Tiles data connection is not initialized. Ensure CheckForNewData has been called.");
            
        }

        protected override async Task CheckForNewData()
        {
            var contents = Directory.GetFiles(_packagePath);

            var tilesFiles = new List<string>();
            var featureFiles = new List<string>();

            foreach (var fileName in contents)
            {
                var filePart = Path.GetFileName(fileName);

                if (FileConfig.TilesFileRegex.IsMatch(filePart))
                {
                    tilesFiles.Add(fileName);
                }

                if (FileConfig.TilesFileRegex.IsMatch(filePart))
                {
                    // featureFiles.Add(fileName);
                }
            }

            // this is crude but works - because we enforce YYYYMMDD.gpkg as the ending
            // for files in the regexes, we can slice off the last 13 characters of the
            // filename and sort them and leverage the sorting of the YYYYMMMDD text.
            tilesFiles.Sort((a, b) => string.Compare(b.Substring(b.Length - 13), a.Substring(a.Length - 13), StringComparison.Ordinal));

            if (tilesFiles.Count == 0)
            {
                throw new Exception("unable to find tiles GeoPackage in ESP_GIS_FOLDER: " + new JavaScriptSerializer().Serialize(contents));
            }

            var tilesFile = tilesFiles[0];

            var tilesPath = Path.Combine(_packagePath, tilesFile);

            Console.WriteLine($"reading tiles from {tilesPath}");

            _tilesDbQueue?.Request(async db =>
            {
                await db.CloseAsync();
                return true; // return value doesn't matter
            });

            _tilesDbQueue = new TaskQueue<SQLiteAsyncConnection>(new SQLiteAsyncConnection(tilesPath));
            _tiles = new FileSystemDataConnection(_tilesDbQueue);
        }
    }

    class FileSystemDataConnection : DataConnection
    {
        private readonly TaskQueue<SQLiteAsyncConnection> _connectionQueue;
        
        public FileSystemDataConnection(TaskQueue<SQLiteAsyncConnection> connectionQueue)
        {
            _connectionQueue = connectionQueue ?? throw new ArgumentNullException(nameof(connectionQueue), "Connection queue cannot be null.");
        }
        
        public override Task<T> Use<T>(Util.Action<SQLiteAsyncConnection, Task<T>> action)
        {
            return _connectionQueue.Request(action);
        }
    }
}
