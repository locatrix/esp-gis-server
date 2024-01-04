
/**
 * @param {string | null} envVar 
 * @param {number} defaultVal 
 * @returns {number}
 */
 function parseEnvInt (envVar, defaultVal) {
  if (envVar == null) {
    return defaultVal
  }

  const parsed = parseInt(envVar, 10)
  if (Number.isNaN(parsed)) {
    return defaultVal
  }

  return parsed
}

export const MAX_SQLITE_TILES_CONNECTIONS = parseEnvInt(
  process.env.ESP_GIS_MAX_SQLITE_TILES_CONNECTIONS
    ?? process.env.PLANSIGHT_GIS_MAX_SQLITE_TILES_CONNECTIONS,
  4
)

export const MAX_SQLITE_FEATURES_CONNECTIONS = parseEnvInt(
  process.env.ESP_GIS_MAX_SQLITE_FEATURES_CONNECTIONS
    ?? process.env.PLANSIGHT_GIS_MAX_SQLITE_FEATURES_CONNECTIONS,
  4
)

export const MAX_SQLITE_CONNECTION_CACHE_SIZE_MB = parseEnvInt(
  process.env.ESP_GIS_MAX_SQLITE_CONNECTION_CACHE_SIZE_MB
    ?? process.env.PLANSIGHT_GIS_MAX_SQLITE_CONNECTION_CACHE_SIZE_MB,
  128
)