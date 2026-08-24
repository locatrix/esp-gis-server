using System;
using System.Web;

namespace EspGisViewer
{
    public class Global : HttpApplication
    {
        protected void Application_Start(object sender, EventArgs e)
        {
            SQLitePCL.raw.SetProvider(new SQLitePCL.SQLite3Provider_winsqlite3());
            Console.WriteLine("EspGisViewer started");
        }
    }
}
