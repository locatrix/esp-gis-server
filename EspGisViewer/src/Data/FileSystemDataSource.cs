using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using System.Web.Configuration;
using EspGisViewer.Util;
using Newtonsoft.Json;
using SQLite;
namespace EspGisViewer.Data
{
    public sealed class FileSystemDataSource : DataSource
    {

        private readonly string _packagePath;

        private TaskQueue<ISQLiteAsyncConnection> _tilesAndFeaturesDbQueue;

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
        
        private FileSystemDataConnection _tilesAndFeatures;
        public override DataConnection TilesAndFeatures
        {
            get => _tilesAndFeatures ?? throw new InvalidOperationException("Tiles data connection is not initialized. Ensure CheckForNewData has been called.");
            
        }

        protected override async Task CheckForNewData()
        {
            var contents = Directory.GetFiles(_packagePath);

            var tilesAndFeaturesFiles = new List<string>();

            foreach (var fileName in contents)
            {
                var filePart = Path.GetFileName(fileName);

                if (FileConfig.TilesAndFeaturesFileRegex.IsMatch(filePart))
                {
                    tilesAndFeaturesFiles.Add(fileName);
                }
            }

            // this is crude but works - because we enforce YYYYMMDD.gpkg as the ending
            // for files in the regexes, we can slice off the last 13 characters of the
            // filename and sort them and leverage the sorting of the YYYYMMMDD text.
            tilesAndFeaturesFiles.Sort((a, b) => string.Compare(b.Substring(b.Length - 13), a.Substring(a.Length - 13), StringComparison.Ordinal));

            if (tilesAndFeaturesFiles.Count == 0)
            {
                throw new Exception("unable to find combined tile and features GeoPackage in ESP_GIS_FOLDER: " + JsonConvert.SerializeObject(contents));
            }

            var tilesAndFeaturesFile = tilesAndFeaturesFiles[0];

            var tilesAndFeaturesPath = Path.Combine(_packagePath, tilesAndFeaturesFile);

            Console.WriteLine($"reading tiles and features from {tilesAndFeaturesPath}");

            _tilesAndFeaturesDbQueue?.Request(async db =>
            {
                await db.CloseAsync();
                return true; // return value doesn't matter
            });

            _tilesAndFeaturesDbQueue = new TaskQueue<ISQLiteAsyncConnection>(new SQLiteAsyncConnection(tilesAndFeaturesPath));
            _tilesAndFeatures = new FileSystemDataConnection(_tilesAndFeaturesDbQueue);
        }
    }

    class FileSystemDataConnection : DataConnection
    {
        private readonly TaskQueue<ISQLiteAsyncConnection> _connectionQueue;
        
        public FileSystemDataConnection(TaskQueue<ISQLiteAsyncConnection> connectionQueue)
        {
            _connectionQueue = connectionQueue ?? throw new ArgumentNullException(nameof(connectionQueue), "Connection queue cannot be null.");
        }
        
        public override Task<T> Use<T>(Util.Action<ISQLiteAsyncConnection, Task<T>> action)
        {
            return _connectionQueue.Request(action);
        }
    }
}
