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
  opts.limit = opts.limit || 0;
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
    if (!inputFinished || outputQueue.size>0) {
      var verb = opts.count<opts.skip ? "Skipping" : "Processing";
      process.stdout.write(verb + " document" + count);  // write text
    } else {
      process.stdout.write("Processed: "+count +" Saved: "+countSaved);
    }
  }, 1000);

  var inputFinished = false;
  var outputQueue = new Set();


  var quitIfDone = function(){
    if (inputFinished) { //already quitting
      return;
    }
    inputFinished = true;
    setTimeout(function() {

      var quittingInterval = setInterval(function() {
        if (inputFinished && outputQueue.size==0){
          clearInterval(quittingInterval);
          clearInterval(statusLoggingInterval);
          callback(null, {
            count:count,
            countSaved:countSaved
          });
        }
      }, 400);

    }, 2000);
  };


  xml.on('endElement: page', function(page) { 
    if (inputFinished)
      return;
    outputQueue.add(page.title);
    var finish = function(){
      outputQueue.delete(page.title);
    }
    
    count ++; 
    if (opts.limit>0&& (count>(opts.skip+opts.limit))) {
      finish();
      quitIfDone();
      return;
    } 
    if (count<=opts.skip) {
      finish();
      return;
    }

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

      collection.insert(doc, function(err, r){
        countSaved ++;
        finish();
      });
    } else {
      finish();
    }

  });

  xml.on('error', function(message) {
    console.log('Parsing as ' + (encoding || 'auto') + ' failed: ' + message);
  });

  xml.on('end', function(message) {
    quitIfDone();

  });


}


exports.loadWiktDumpToMongo = loadWiktDumpToMongo;

var skip = argv.skip || process.env["SKIP"] || 0;
var limit = argv.limit || process.env["LIMIT"] || 0;
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
      loadWiktDumpToMongo(db, file, {skip:skip,limit:limit, show:show, verbose:verbose, justCount:justCount},function(err, res){
        db.close();
      });

    })
}

if (require.main === module) {
    main();
}



  