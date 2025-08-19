using System;
using System.Collections.Generic;
namespace EspGisViewer.Util
{
    public static class DictionaryOps
    {
        public static TV GetValue<TK, TV>(this Dictionary<TK, TV> dict, TK key, TV defaultValue = default(TV))
        {
            return dict.TryGetValue(key, out var value) ? value : defaultValue;
        }
    }
}
