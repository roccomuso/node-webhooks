var should = require('should');
var http = require('http');
var fs = require('fs');
var path = require('path');
var WebHooks = require('../index');
var webHooks;
var DB_FILE = path.join(__dirname, './webHooksDB.json');  // json file that store webhook URLs

// instantiate a basic web server
var PORT = 8000;
var URI = 'http://127.0.0.1:'+PORT;

function handleRequest(request, response){
    console.log('called method:', request.method);
    console.log('called URL:', request.url);
    console.log('headers:', request.headers);
    console.log('body:', request.body);
    response.end('It Works!! Path Hit: ' + request.url);
}

//Create a server
var server = http.createServer(handleRequest);

describe('Tests >', function(){
  before(function(done){
    //Lets start our server
    server.listen(PORT, function(){
        //Callback triggered when server is successfully listening. Hurray!
        console.log('Server listening on: http://localhost:%s', PORT);
        done();
    });

  });
  after(function(done){
    // stop the server
    server.close(function(){
      done();
    });
  });

  it('eventually delete old DB', function(done){
    fs.unlinkSync(DB_FILE);
    done();
  });

  it('create a node-webHooks istance', function(done){
    webHooks = new WebHooks({
        db: DB_FILE,
    });
    should.exist(webHooks);
    webHooks.should.be.an('object');
    done();
  });

  it('check wether the DB file exists or not', function(done){
    fs.stat(DB_FILE, function(err) {
        should.not.exist(err);
        done();
    });
  });

  it('add a webHook called hook1', function(done){
    webHooks.add('hook1', URI+'/1/aaa').then(function(){
        done();
    }).catch(function(err){
        throw new Error(err);
    });
  });

  it('add a new URL to the webHook hook1', function(done){
    webHooks.add('hook1', URI+'/1/bbb').then(function(){
        done();
    }).catch(function(err){
        throw new Error(err);
    });
  });

  it ('should get the webHook using the .getWebHook method', function(done){
    webHooks.getWebHook('hook1').then(function(obj){
      // TODO
      console.log('metodo .getWebHook:');
      console.log(obj);

      done();
    }).catch(function(err){
      throw new Error(err);
    });
  });

});

// - basic server
// - create a webhook istance
// - check wether the json db file exists or not
// - put a webHook
// - add a new URL to the existing webHook
// - call the getWebHook method
// - fire the webHook with no body or headers
// - fire the webHook with body.
// - fire the webHook with headers.
// - fire the webHook with both body and headers.
// - delete a single webHook URL.
// - fire the webHook and make sure just one URL is called.
// - delete the entire webHook.
// - fire the webHook and make sure no request is dispatched at all.
// - create a new webHook.
// - fire the webHook 100 times. Expected 100 REST calls.
