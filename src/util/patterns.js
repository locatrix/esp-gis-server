
// files like espqld-tiles-20231115.gpkg are valid.
// any leading prefix is also fine (so, "foo bar baz-tiles-20231115.gpkg"
// would be valid).

export const TILES_FILE_REGEX = /^[^\.]+-tiles-\d\d\d\d\d\d\d\d\.gpkg$/
export const FEATURES_FILE_REGEX = /^[^\.]+-features-\d\d\d\d\d\d\d\d\.gpkg$/
