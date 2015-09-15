
var assert = require('chai').assert;
var expect = require('chai').expect;
var wiktionaryToMongo = require('../');
var path = require('path');
var fs = require('fs');
var comongo = require('co-mongo');
var coMocha = require('co-mocha');
var mocha = require("mocha");
coMocha(mocha)

comongo.configure({
    host: '127.0.0.1',
    port: 27017,
    name: 'wiktionaryToMongo',
    pool: 10,
    collections: ['wiktionaryDump']
});

describe('conventer', function() {
  	
  before(function *() {
    var db = yield comongo.get();
    var collection = db.wiktionaryDump;
    yield collection.drop();
  });
  it('should convert dump fixture to mongo', function *() {
    var result = yield wiktionaryToMongo(path.join(__dirname, "fixtures", "enwictionary-beginning.xml"));
    var db = yield comongo.get();
    var collection = db.wiktionaryDump;
    var documents = yield collection.find({}, {title: 1, namespace:1}).toArray();
    var docs = documents.map(function(i){
      return {
        title:i.title,
        namespace:i.namespace
      }
    });

    console.log(JSON.stringify(docs, 2));
    expect(docs).to.deep.include.members([
      {"title":"ǵʰuto-","namespace":"ine-pro"},
      {"title":"dictionary","namespace":null},
      {"title":"august","namespace":null}]);

  });
    
});
