#!/usr/bin/env node --harmony
var argv = require('yargs').argv;

var comongo = require('co-mongo');
 
comongo.configure({
    host: '127.0.0.1',
    port: 27017,
    name: 'etymolator',
    pool: 10,
    collections: ['wiktionaryDump', 'words']
});


var etymolator = require("../");
var prettyjson = require('prettyjson');
var co = require("co");
var word= argv._[0] ;
var comongo = require('co-mongo');

co(function *() {
  var db = yield comongo.get();

  var collection = db.wiktionaryDump;

  if (!word){
		var count = yield collection.count();

		console.log("Total words in database: ", count);
		var lastIndex = 0;
		for (var i=0; i<10; i++) {
			var lastIndex = Math.random() * (count-lastIndex);
			var sampleWordDoc = (yield collection.find().limit(-1).skip(lastIndex).toArray())[0];
			console.log(sampleWordDoc.title);
		}
		yield  db.close();
	} else {
		var doc = yield collection.findOne({ title: word });

	  console.log("Word '"+word+"'");
	  console.log(doc.text);

	  var parsedText = yield etymolator.parseText(word, doc.text);
	  console.log(prettyjson.render(parsedText));
	  yield 	db.close();

		
	}
}).catch(onerror);

function onerror(err) {
  // log any uncaught errors
  // co will not throw any errors you do not handle!!!
  // HANDLE ALL YOUR ERRORS!!!
  console.error(err.stack);
}


	

