#!/bin/bash

VERSION=$(cat package.json | grep '"version":' | sed -E 's/^.*([0-9]+\.[0-9]+\.[0-9]+).*$/\1/g')

docker build --platform linux/amd64 -t locatrix/plansight-gis-server:latest -t locatrix/plansight-gis-server:$VERSION .
docker push locatrix/plansight-gis-server:latest
docker push locatrix/plansight-gis-server:$VERSION
