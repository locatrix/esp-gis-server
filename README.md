<p align="center">
  <img src="./docs/media/esp-logo.png" width="128" title="ESP Icon">
</p>

# ESP GIS Server
ESP GIS Server is a free, standalone web server that takes GeoPackages generated by Locatrix and serves them up through standard WMTS/WFS endpoints, as well as offering a browser-based viewer.

This allows you to consume ESP GIS GeoPackages in a self-hosted way, without any dependencies on Locatrix web services. This approach is recommended for emergency services applications.

## Getting Started
ESP GIS Server images are distributed via [Docker](https://hub.docker.com/r/locatrix/plansight-gis-server). This makes it easy to run ESP GIS Server with [Docker Desktop](https://www.docker.com/products/docker-desktop/) on your own machine, or provision containerised infrastructure in the cloud to run it in a production setting.

Alternatively, you can clone this repository and run ESP GIS Server using Node 18 or newer.

### Running locally using Docker
With Docker Desktop installed, you can run ESP GIS Server using the following command (replacing `/path/to/geopackages/folder` with the path to the folder where the ESP GeoPackages are stored on your machine):

```bash
docker run --rm -it -p 3000:3000 --env ESP_GIS_DATA_SOURCE=filesystem --env ESP_GIS_FOLDER=/gpkgs -v /path/to/geopackages/folder:/gpkgs locatrix/plansight-gis-server
```

### Running locally using Node
If you don't want to use Docker, you'll need to install Node 18 (or newer) and Yarn.

```bash
# install yarn (if you don't already have it installed)
npm install --global yarn

# checkout esp-gis-server code (skip if you've just downloaded
# the .zip file from GitHub)
git clone https://github.com/locatrix/esp-gis-server.git
cd esp-gis-server

# install dependencies
yarn install
yarn start
```

Once the server is running, the following URLs can be used:

| Resource | URL |
|----------|-----|
| Web Viewer | [http://localhost:3000/viewer](http://localhost:3000/viewer) |
| WFS Endpoint | [http://localhost:3000/wfs](http://localhost:3000/wfs) |
| WMTS Endpoint | [http://localhost:3000/wmts/capabilities.xml](http://localhost:3000/wmts/capabilities.xml) |


### Running in Production
We recommend using Azure Container Apps or Amazon ECS to run ESP GIS Server in production. Both offerings provide consumption-based pricing, meaning that you are only charged for bandwidth + resource usage per request (not a fixed rate per hour/month).

IP-based restrictions can be applied to ensure that only authorised traffic is able to access ESP GIS Server.

#### Scaling
ESP GIS Server is designed to scale horizontally instead of vertically. Due to the server only needing read-only access to data, it's possible to horizontally scale the server without any additional configuration.

## Obtaining Data
While ESP GIS Server is open source, the underlying GeoPackages ("GIS data") containing Locatrix floorplan data are not.

GIS data can be obtained by entering into a commercial agreement with Locatrix, with access to data being governed by Section 10 of the [PlanStudio Terms & Conditions](https://www.locatrix.com/legal/planstudio-terms-conditions). To learn more, contact us at https://www.locatrix.com/contact (choose "PlanSight" as the product).

Once an agreement has been established that includes access to ESP GIS data, Locatrix will push timestamped GIS data into a storage location hosted by the ESP customer.

We recommend Azure Blob Storage for hosting ESP GIS data, as the ESP GIS Server is able to directly access this storage and serve up data without any manual copying or intervention. Lifecycle management policies can be set up to automatically delete old data after a period of time, ensuring that old data is automatically cleaned up.

## Server Data Sources
GeoPackage data can be retrieved from Azure Blob Storage containers, Amazon S3 buckets, or folders on the filesystem. As per the previous section, we recommend using Azure Blob Storage.

By targeting containers/buckets/folders rather than directly targeting individual GeoPackage files, ESP GIS Server is able to automatically show data from the most recent packages, without any config updates or server restarts.

GeoPackages must be named using the following convention, where filenames may start with anything but must end in a standard suffix:

| Package  | Name                         |
|----------|------------------------------|
| Tiles    | `***-tiles-YYYYMMDD.gpkg`    |
| Features | `***-features-YYYYMMDD.gpkg` |

This naming convention is followed by Locatrix when pushing new GeoPackages to your storage location, so you typically won't need to worry about anything.

ESP GIS Server checks for newer GeoPackages on requests to capabilities URLs, and up to every minute when accessing tile/feature URLs.

ESP GIS Server will always use data from GeoPackages with the newest timestamp in their filename, regardless of whether they were the most recently created/modified file according to filesystem metadata.

## Configuration
In order to choose your desired data source, you will need to use environment variables to configure ESP GIS Server. These can be set either via your OS's normal systems for setting environment variables, or by using a `.env` file saved in the same folder as this README.md file.

### `blob-container`
When using Azure Blob Storage containers, access is granted via SAS URLs. Note that the SAS URL needs to have Read and List permissions. You can generate a SAS URL that points to the entire container, or to a folder within the container.

```bash
ESP_GIS_DATA_SOURCE="blob-container"
ESP_GIS_BLOB_SAS_URL="https://<containername>.blob.core.windows.net/<folder path>?<sas signature>
```

### `s3-bucket`
When using Amazon S3 buckets, you identify the bucket (or folder within a bucket) via an S3 URL. Access is handled via the standard AWS environment vars for account keys/secrets/regions.

```bash
ESP_GIS_DATA_SOURCE="s3-bucket"
ESP_GIS_S3_URI="s3://<bucket name>/<folder path>"
AWS_ACCESS_KEY_ID="<access key>"
AWS_SECRET_ACCESS_KEY="<secret key>"
AWS_REGION="<aws region (e.g ap-southeast-2)>"
```


### `filesystem`
You can point ESP GIS Server at a folder on your filesystem (which can be local or networked) that contains the GeoPackages.

```bash
ESP_GIS_DATA_SOURCE="filesystem"
ESP_GIS_FOLDER="/path/to/folder"
```

### Configuration for HTTP-based providers
When using the `blob-container` or `s3-bucket` provider, there are additional config options that can be set to fine-tune the resource usage of the sqlite3-over-HTTP streaming. Their names and default values are given below:

```bash
ESP_GIS_MAX_SQLITE_TILES_CONNECTIONS=4
ESP_GIS_MAX_SQLITE_FEATURES_CONNECTIONS=4
ESP_GIS_MAX_SQLITE_CONNECTION_CACHE_SIZE_MB=128
```

## Caveats

- ESP GIS Server only works with GeoPackages created by Locatrix - it does not work with standard GeoPackages. This is because the server relies on the special data structure and indices contained in Locatrix-generated GeoPackages to enable efficient querying.
- The WMTS/WFS implementations in ESP GIS Server are extremely minimal and do not conform to 100% of the standards. They have been tested to work under:
    - ArcGIS Online (Map Viewer Classic)
    - ArcGIS Online (Map Viewer)
    - QGIS
