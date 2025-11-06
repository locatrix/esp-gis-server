using System;
using System.Web;

namespace EspGisViewer
{
    public class Global : HttpApplication
    {
        protected void Application_Start(object sender, EventArgs e)
        {
            SQLitePCL.Batteries.Init();
            Console.WriteLine("EspGisViewer started");
        }
    }
}
