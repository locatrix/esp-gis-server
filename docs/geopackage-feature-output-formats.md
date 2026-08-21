# Feature Output Formats GeoPackage Extension

## Introduction

This extension defines declarative, format-specific transformations for feature attributes stored in a GeoPackage. It allows a service to preserve one canonical value while presenting that value appropriately in different output encodings.

## Extension Author

Locatrix, author name `locatrix`.

## Extension Name

`locatrix_feature_output_formats`

## Extension Type

New requirement dependent on the GeoPackage Features and Extension Mechanism clauses.

## Applicability

This extension applies to feature attribute columns. It adds the `feature_output_formats` extension table; it does not modify a GeoPackage core table or the declared SQL type of a feature attribute.

## Scope

Read-write.

## Requirements

### GeoPackage

A GeoPackage implementing this extension SHALL contain this table:

```sql
CREATE TABLE feature_output_formats (
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  source_format TEXT NOT NULL,
  output_format TEXT NOT NULL,
  formatter TEXT NOT NULL,
  options TEXT,
  PRIMARY KEY (table_name, column_name, output_format)
);
```

The GeoPackage SHALL register the table in `gpkg_extensions` with these values:

| Column | Value |
|---|---|
| `table_name` | `feature_output_formats` |
| `column_name` | `NULL` |
| `extension_name` | `locatrix_feature_output_formats` |
| `definition` | `https://github.com/locatrix/esp-gis-server/blob/main/docs/geopackage-feature-output-formats.md` |
| `scope` | `read-write` |

Each `table_name` and `column_name` pair in `feature_output_formats` SHALL identify an existing feature attribute column. Names are compared case-insensitively, consistent with SQLite identifiers.

`source_format` describes the stored value:

- `text`: use the stored SQL value without decoding.
- `json`: parse the stored TEXT value as JSON.

`output_format` is a lowercase output encoding identifier. This extension defines `geojson` and `xml`; implementations MAY support additional identifiers.

`formatter` describes how to present the decoded value:

- `native`: preserve the decoded value and its structure.
- `delimited`: join the elements of a decoded JSON array into text. The separator defaults to `, `.

When present, `options` SHALL be a JSON object. The `delimited` formatter accepts a string `separator` member.

A reader that does not support an identified source format, output format, formatter, options value, or stored value SHALL ignore the affected transformation. It MAY expose the stored value through another supported interface.

### GeoPackage SQLite Configuration

None.

### GeoPackage SQLite Extension

None.

## Abstract Test Suite

1. Verify that `feature_output_formats` has the table definition above.
2. Verify that `gpkg_extensions` contains the required registration row.
3. Verify that every referenced table and column exists.
4. Verify that `source_format` is `text` or `json`.
5. Verify that `output_format` is a non-empty lowercase identifier.
6. Verify that `formatter` is `native` or `delimited`.
7. Verify that every non-NULL `options` value is a JSON object.
8. For `delimited`, verify that the decoded value is a JSON array and that `options.separator`, when present, is a string.

## Example

```sql
INSERT INTO feature_output_formats
  (table_name, column_name, source_format, output_format, formatter, options)
VALUES
  ('plans', 'floors', 'json', 'geojson', 'native', NULL),
  ('plans', 'floors', 'json', 'xml', 'delimited', '{"separator":", "}');
```