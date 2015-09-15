
var assert = require('chai').assert;
var expect = require('chai').expect;
var wiktionaryToMongo = require('../');
var path = require('path');
var fs = require('fs');
var MongoClient = require('mongodb').MongoClient;

var fixturePath = path.join(__dirname, "fixtures", "enwictionary-beginning.xml");

describe('conventer', function() {
  	

  var db = null;
  var collection = null;

  beforeEach(function(done){
    MongoClient.connect('mongodb://127.0.0.1:27017/wiktionaryToMongo', function(err, theDb) {
      collection = theDb.collection('wiktionaryDump');
      db = theDb;
      collection.ensureIndex({title:1, namespace:1}, {unique:true}, function(err,res) {
        done();
      });
    });

  })

  afterEach(function (done) {
    collection.drop(function(err){
      db.close(function(err){
        done();
      })
    });
  });
  it('should convert dump fixture to mongo', function (done) {
    this.timeout(10000);
    wiktionaryToMongo.loadWiktDumpToMongo(db, fixturePath, {}, function(err, r){
      expect(r).eql({
        count:7,
        countSaved:3
      });
      collection.find({}, {title: 1, namespace:1}).toArray(function(err, docs){
        var docs = docs.map(function(i){
          return {
            title:i.title,
            namespace:i.namespace
          }
        });

        expect(docs).to.deep.include.members([
          {"title":"ǵʰuto-","namespace":"ine-pro"},
          {"title":"dictionary","namespace":null},
          {"title":"august","namespace":null}]);
        done();
      });
    });
  });

  it('should respect skip', function (done) {
    this.timeout(10000);
    wiktionaryToMongo.loadWiktDumpToMongo(db, fixturePath, {skip:6}, function(err, r){
      expect(r).eql({
        count:7,
        countSaved:1
      });
      done();
    });
  });

  it('should respect limit', function (done) {
    this.timeout(10000);
    wiktionaryToMongo.loadWiktDumpToMongo(db, fixturePath, {limit:5}, function(err, r){
      expect(r).eql({
        count:6,
        countSaved:1
      });
      done();
    });
  });

  it('should respect skip and limit', function (done) {
    this.timeout(10000);
    wiktionaryToMongo.loadWiktDumpToMongo(db, fixturePath, {skip:5, limit:2}, function(err, r){
      expect(r).eql({
        count:7,
        countSaved:2
      });
      done();
    });
  });


    
});
