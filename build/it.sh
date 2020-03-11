
set -e
VER=`sed 's/.*"version": "\(.*\)".*/\1/;t;d' ../package.json`
docker build . -t codeofnode/allrounder:$VER
docker tag codeofnode/allrounder:$VER codeofnode/allrounder:latest
docker push codeofnode/allrounder:$VER
docker push codeofnode/allrounder:latest
