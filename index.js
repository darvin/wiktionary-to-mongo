#!/usr/bin/env node --harmony

var argv = require('yargs').argv;

var fs        = require('fs')
var path      = require('path')
var XmlStream = require('xml-stream')
var wictionaryParser= require("wiktionary-parser");
var prettyjson = require('prettyjson');

var MongoClient = require('mongodb').MongoClient;

function loadDb(callback) {
    MongoClient.connect('mongodb://127.0.0.1:27017/wiktionaryToMongo', function(err, db) {
      db.collection('wiktionaryDump').ensureIndex({title:1, namespace:1}, {unique:true}, function(err,res) {
        callback(err, db);
      });
    });

}

var loadWiktDumpToMongo = function (db, file, opts, callback) {
  opts.skip = opts.skip || 0;
  var stream = fs.createReadStream(file);
  var count = 0;
  var countSaved = 0;
  var collection = db.collection('wiktionaryDump');

  var xml = new XmlStream(stream);
  xml._preserveAll=true //keep newlines
  // xml.preserve('text');



  var statusLoggingInterval = setInterval(function() {
    process.stdout.clearLine();  // clear current text
    process.stdout.cursorTo(0);  // move cursor to beginning of line

    var verb = opts.count<opts.skip ? "Skipping" : "Processing";

    process.stdout.write(verb + " document" + count);  // write text
  }, 1000);

  var inputFinished = false;
  var outputQueue = new Set();


  var quitIfDone = function(){
    console.log("Truijn to quit ", inputFinished, outputQueue.size);
    if (inputFinished && outputQueue.size==0){
      console.log("quit");
      clearInterval(statusLoggingInterval);
      callback(null, {
        count:count,
        countSaved:countSaved
      });
    }
  }


  xml.on('endElement: page', function(page) { 

      if (!inputFinished) {
        count ++; 
      } 
      if (opts.limit&& (count>=opts.skip+opts.limit)) {
        inputFinished = true; 
        quitIfDone();

      } else if (count>opts.skip && !opts.justCount) {
        var namespaceName = null;
        var title = page.title;
        if (page.ns!="0") {
          namespaceName = page.title.split("/")[0];
          title = page.title.split("/")[1];
        }

        if(namespaceName==null ||
          wictionaryParser.getSpecialNamespaces().hasOwnProperty(namespaceName)){
            var script=page.revision.text["$text"] || '';
            var ns = wictionaryParser.getLangCodeForNamespace(namespaceName)||null;

            
            var doc = {
              title:title,
              text:script,
              namespace:ns
            }

            // console.log("doc", doc);
            var idd = title+"|"+ns;
            outputQueue.add(idd);
            collection.insert(doc, function(err, r){
              outputQueue.delete(idd);
              countSaved ++;
              quitIfDone();
            });
            if (verbose) {
              // console.log("Written to db: ", prettyjson.render(r));

            }
        } 
      }
  });

  xml.on('error', function(message) {
    console.log('Parsing as ' + (encoding || 'auto') + ' failed: ' + message);
  });

  xml.on('end', function(message) {
    console.log('Dump processing finished')
    inputFinished = true;
  });


}


exports.loadWiktDumpToMongo = loadWiktDumpToMongo;

var skip = argv.skip || 0;
var limit = argv.limit;
var show = argv.show;
var verbose = argv.verbose;
var justCount = argv.just_count;
var file= argv._[0] ||  "../DumpData/enwiktionary-20150901-pages-articles-multistream.xml";




function onerror(err) {
  // log any uncaught errors
  // co will not throw any errors you do not handle!!!
  // HANDLE ALL YOUR ERRORS!!!
  console.error(err.stack);
}

var main = function(){
    console.log("starting");
    console.log("params: ", file, skip,limit, show, verbose, justCount);
    loadDb(function(err, db) {
      loadWiktDumpToMongo(db, file, {skip:skip,limit:limi, show:show, verbose:verbose, justCount:justCount},function(err, res){
        db.close();
      });

    })
}

if (require.main === module) {
    main();
}



  