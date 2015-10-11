#!/bin/sh

df -m

BUILD_DIR=./build
XML_DUMP=$BUILD_DIR/enwiktionary-latest-pages-articles-multistream.xml.bz2
XML_DUMP_UNPACKED=$BUILD_DIR/enwiktionary-latest-pages-articles-multistream.xml
MONGO_DUMP=$CIRCLE_ARTIFACTS/enWiktionaryDump.json.bz2
if [ ! -f $XML_DUMP ]; then
    wget https://dumps.wikimedia.org/enwiktionary/latest/enwiktionary-latest-pages-articles-multistream.xml.bz2 -P $BUILD_DIR
fi

bzip2 -d $XML_DUMP
ls
node --harmony index.js $XML_DUMP_UNPACKED
rm $XML_DUMP_UNPACKED
mongoexport --db wiktionaryToMongo --collection wiktionaryDump |bzip2 > $MONGO_DUMP
