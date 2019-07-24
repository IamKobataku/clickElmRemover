background.js  content.js  img  manifest.json  README.md  victivesite
rm -rf dist
mkdir dist
cp -rf background.js  content.js img  manifest.json dist
cd dist
zip release.zip -rm ./*
