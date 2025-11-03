using System;
using System.Web;

namespace EspGisViewer
{
    public class Global : HttpApplication
    {
        protected void Application_Start(object sender, EventArgs e)
        {
            // Initialize SQLitePCLRaw bundle (v2) for desktop/ASP.NET
            SQLitePCL.Batteries_V2.Init();
            Console.WriteLine("EspGisViewer started");
        }
    }
}
