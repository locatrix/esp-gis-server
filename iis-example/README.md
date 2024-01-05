# Hosting ESP GIS Server with IIS

This is an example of how to host ESP GIS Server on Windows with IIS.

## IIS Dependencies
When running in production, you'll need to make sure the following are installed onto the server:

- [Node.js 18 or newer](https://nodejs.org/en/download)
- [iisnode](https://github.com/Azure/iisnode/releases)
- [IIS Rewrite Module](https://www.iis.net/downloads/microsoft/url-rewrite)

## Sample `web.config` file
This example uses the [`web.config`](https://github.com/locatrix/esp-gis-server/blob/main/web.config) file that is checked into this repo's top level. This config can be used as a reference for setting up a production server, but you **need** to change the iisnode settings to disable the debug/development features once you've got things up and running.

## Setting up IIS

### Real server
On a Windows server, you'll need to ensure the IIS dependencies listed above are installed first and then run the following commands:

```powershell
# install yarn (if you don't already have it installed)
npm install --global yarn

# clone the repo
git clone https://github.com/locatrix/esp-gis-server.git
cd esp-gis-server

# install dependencies
yarn install
```

Once the dependencies are installed, the esp-gis-server folder can then be moved into an appropriate location for IIS sites (or into an existing site as a subfolder).

You'll want to edit the `<appSettings>` section of the web.config file to configure the server by pointing it at the GeoPackages and ensuring any URL prefixes/protocols are set appropriately. If you encounter any errors, the log files from iisnode will be created in the `esp-gis-server/iisnode` folder. 

### Test environment
Rather than setting up IIS on your own machine, or setting up a Windows Server VM, you can use Docker on Windows to set up an IIS test environment that can be used to experiment with running ESP GIS Server under IIS.

The following commands are tested under Windows 10, and require your Docker Desktop environment to be set into Windows mode.

```powershell
# install yarn (if you don't already have it installed)
npm install --global yarn

# clone the repo
git clone https://github.com/locatrix/esp-gis-server.git
cd esp-gis-server

# install dependencies
yarn install

# make sure your shell is in the iis-example folder
cd iis-example

# build the Dockerfile
docker build -t esp-gis-server-iis-example .

# start the container in the background - note that you need to replace
# C:\path\to\geopackages\folder with the full path to the geopackages
# folder on your own machine.
docker run --rm --name esp-gis-server-iis-example -d -v C:\path\to\geopackages\folder:C:\espdata -v "$(Split-Path (Get-Location).Path -Parent):C:\inetpub\wwwroot\esp-gis-server" esp-gis-server-iis-example

# get the container's IP address so you can access it
docker inspect --format '{{ .NetworkSettings.Networks.nat.IPAddress }}' esp-gis-server-iis-example


# you should be able to navigate to:
#     http://<container ip address>/esp-gis-server/viewer
# and see a map.


# when you're finished, you can stop IIS and clean it up using:
docker stop esp-gis-server-iis-example
```
