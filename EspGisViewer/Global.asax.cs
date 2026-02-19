using System;
using System.IO;
using System.Web;

namespace EspGisViewer
{
    public class Global : HttpApplication
    {
        private static string x86SqliteSourcePath => Path.Combine(AppContext.BaseDirectory, @"LocatrixDeps\x86\e_sqlite3.dll");
        private static string x64SqliteSourcePath => Path.Combine(AppContext.BaseDirectory, @"LocatrixDeps\x64\e_sqlite3.dll");
        
        protected void Application_Start(object sender, EventArgs e)
        {
            SetupSqliteDependencies();

            SQLitePCL.Batteries.Init();
            Console.WriteLine("EspGisViewer started");
        }

        /// <summary>
        /// Copy SQLitePCL dependencies to a temporary directory.
        /// </summary>
        private static void SetupSqliteDependencies()
        {
            if (!File.Exists(x86SqliteSourcePath))
            {
                throw new FileNotFoundException("EspGisViewer x86 sqlite file not found");
            }

            if (!File.Exists(x64SqliteSourcePath))
            {
                throw new FileNotFoundException("EspGisViewer x64 sqlite file not found");
            }
            
            string tmpPath = Path.Combine(Path.GetTempPath(), "LocatrixDeps\\" + DateTime.Now.ToString("yyyyMMddHHmmssfff"));
           
            // SQLitePCL needs the parent directory of the "x64" and "x86" folders
            SQLitePCL.Settings.BaseDirectoryForDynamicLoadNativeLibrary = tmpPath;
            
            string x86TmpPath = Path.Combine(tmpPath, "x86");
            string x64TmpPath = Path.Combine(tmpPath, "x64");
            
            if (!Directory.Exists(x86TmpPath))
            {
                Directory.CreateDirectory(x86TmpPath);
            }
            
            if (!Directory.Exists(x64TmpPath))
            {
                Directory.CreateDirectory(x64TmpPath);
            }
            
            File.Copy(x86SqliteSourcePath, Path.Combine(x86TmpPath, "e_sqlite3.dll"), true);
            File.Copy(x64SqliteSourcePath, Path.Combine(x64TmpPath, "e_sqlite3.dll"), true);
        }
    }
}
