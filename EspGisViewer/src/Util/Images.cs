using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
namespace EspGisViewer.Util
{
    public static class Images
    {
        // smallest possible transparent PNG
        public static readonly byte[] TransparentImage = Convert.FromBase64String("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
        
        public static byte[] OverlapImages(List<byte[]> images)
        {
            if (images == null || images.Count == 0)
                return TransparentImage;

            return images.Aggregate(OverlapImages);
        }
        
        private static byte[] OverlapImages(byte[] image1, byte[] image2)
        {
            // parse both images as PNG
            using (var ms1 = new System.IO.MemoryStream(image1))
            {
                var bitmap = new Bitmap(ms1);
                
                using (var ms2 = new System.IO.MemoryStream(image2))
                {
                    var bitmap2 = new Bitmap(ms2);
                    
                    var width = Math.Max(bitmap.Width, bitmap2.Width);
                    var height = Math.Max(bitmap.Height, bitmap2.Height);
                    
                    var resultBitmap = new Bitmap(width, height);
                    
                    using (var g = Graphics.FromImage(resultBitmap))
                    {
                        // draw the first image
                        g.DrawImage(bitmap, 0, 0);
                        
                        // draw the second image on top of the first
                        g.DrawImage(bitmap2, 0, 0);
                    }
                    
                    // save the result to a memory stream
                    using (var msResult = new System.IO.MemoryStream())
                    {
                        resultBitmap.Save(msResult, System.Drawing.Imaging.ImageFormat.Png);
                        return msResult.ToArray();
                    }
                }
            }
        }
    }
}
