var chai = require('chai');
var expect = chai.expect;
var should = chai.should();
var debug = require('debug')('test-suite');
var http = require('http');
var fs = require('fs');
var path = require('path');
var WebHooks = require('../index');
var webHooks;
var emitter;
var DB_FILE = path.join(__dirname, './webHooksDB.json'); // json file that store webhook URLs

// IMPLEMENTED TESTS:

// - spawn a basic server
// - create a webhook istance
// - check wether the json db file exists or not
// - put a webHook
// - add a new URL to the existing webHook
// - call the getWebHook method
// - fire the webHook with no body or headers
// - fire the webHook with custom body.
// - fire the webHook with custom headers.
// - fire the webHook with both body and headers.
// - delete a single webHook URL.
// - fire the webHook and make sure just one URL is called.
// - delete the entire webHook.
// - fire the webHook and make sure no request is dispatched at all.
// - create a new webHook.
// - fire the webHook 1000 times. Expected 1000 REST calls.


// instantiate a basic web server
var PORT = 8000;
var URI = 'http://127.0.0.1:' + PORT;

var OUTCOMES = {};
var LOADTEST = 0;

function handleRequest(request, response) {
    debug('called method:', request.method);
    debug('called URL:', request.url);
    debug('headers:', request.headers);
    var body = [];
    request.on('data', function(chunk) {
        body.push(chunk);
    }).on('end', function() {
        body = Buffer.concat(body).toString(); // as string
        OUTCOMES[request.url] = {
            headers: request.headers,
            body: body
        };
        if (request.url.indexOf('/2/') !== -1) LOADTEST++;
        debug('body:', body);
        if (request.url.indexOf('/fail') !== -1)
          response.writeHead(400, {'Content-Type': 'application/json'});
        else
          response.writeHead(200, {'Content-Type': 'application/json'});
        response.end('Path Hit: ' + request.url);

    });

}

//Create a server
var server = http.createServer(handleRequest);

describe('Tests >', function() {
    before(function(done) {
        //Lets start our server
        server.listen(PORT, function() {
            //Callback triggered when server is successfully listening. Hurray!
            debug('Server listening on: http://localhost:%s', PORT);
            done();
        });

    });

    it('eventually delete old DB', function(done) {
        try {
            fs.unlinkSync(DB_FILE);
        } catch (e) {}
        done();
    });

    it('create a node-webHooks istance', function(done) {
        webHooks = new WebHooks({
            db: DB_FILE,
        });
        should.exist(webHooks);
        webHooks.should.be.an('object');
        done();
    });

    it('check wether the DB file exists or not', function(done) {
        fs.stat(DB_FILE, function(err) {
            should.not.exist(err);
            done();
        });
    });

    it('add a webHook called hook1', function(done) {
        webHooks.add('hook1', URI + '/1/aaa').then(function() {
            done();
        }).catch(function(err) {
            throw new Error(err);
        });
    });

    it('add a new URL to the webHook hook1', function(done) {
        webHooks.add('hook1', URI + '/1/bbb').then(function() {
            done();
        }).catch(function(err) {
            throw new Error(err);
        });
    });

    it('should get the webHook using the .getWebHook method', function(done) {
        webHooks.getWebHook('hook1').then(function(obj) {
            should.exist(obj);
            expect(obj.length).to.equal(2);
            expect(obj).to.have.members([URI + '/1/aaa', URI + '/1/bbb']);
            done();
        }).catch(function(err) {
            throw new Error(err);
        });
    });

    it('should fire the webHook with no body or headers', function(done) {
        this.timeout(3000);
        webHooks.trigger('hook1');
        setTimeout(function() {
            debug('OUTCOME-1:', OUTCOMES);
            should.exist(OUTCOMES['/1/aaa']);
            should.exist(OUTCOMES['/1/bbb']);
            expect(OUTCOMES['/1/aaa']).to.have.property('headers');
            expect(OUTCOMES['/1/aaa']).to.have.property('body').equal('');
            expect(OUTCOMES['/1/bbb']).to.have.property('headers');
            expect(OUTCOMES['/1/bbb']).to.have.property('body').equal('');
            done();
        }, 1000);
    });

    it('should fire the webHook with custom body', function(done) {
        this.timeout(3000);
        OUTCOMES = {};
        webHooks.trigger('hook1', {
            hello: 'world'
        });
        setTimeout(function() {
            debug('OUTCOME-2:', OUTCOMES);
            should.exist(OUTCOMES['/1/aaa']);
            should.exist(OUTCOMES['/1/bbb']);
            expect(OUTCOMES['/1/aaa']).to.have.property('headers');
            expect(OUTCOMES['/1/aaa']).to.have.property('body').equal('{"hello":"world"}');
            expect(OUTCOMES['/1/bbb']).to.have.property('headers');
            expect(OUTCOMES['/1/bbb']).to.have.property('body').equal('{"hello":"world"}');
            done();
        }, 1000);
    });

    it('should fire the webHook with custom headers', function(done) {
        this.timeout(3000);
        OUTCOMES = {};
        webHooks.trigger('hook1', {}, {
            hero: 'hulk'
        });
        setTimeout(function() {
            debug('OUTCOME-3:', OUTCOMES);
            should.exist(OUTCOMES['/1/aaa']);
            should.exist(OUTCOMES['/1/bbb']);
            expect(OUTCOMES['/1/aaa']).to.have.deep.property('headers.hero').equal('hulk');
            expect(OUTCOMES['/1/aaa']).to.have.property('body').equal('{}');
            expect(OUTCOMES['/1/bbb']).to.have.deep.property('headers.hero').equal('hulk');
            expect(OUTCOMES['/1/bbb']).to.have.property('body').equal('{}');
            done();
        }, 1000);
    });

    it('should fire the webHook with both custom body and headers', function(done) {
        this.timeout(3000);
        OUTCOMES = {};
        webHooks.trigger('hook1', {
            hello: 'rocco'
        }, {
            hero: 'iron-man'
        });
        setTimeout(function() {
            debug('OUTCOME-3:', OUTCOMES);
            should.exist(OUTCOMES['/1/aaa']);
            should.exist(OUTCOMES['/1/bbb']);
            expect(OUTCOMES['/1/aaa']).to.have.deep.property('headers.hero').equal('iron-man');
            expect(OUTCOMES['/1/aaa']).to.have.property('body').equal('{"hello":"rocco"}');
            expect(OUTCOMES['/1/bbb']).to.have.deep.property('headers.hero').equal('iron-man');
            expect(OUTCOMES['/1/bbb']).to.have.property('body').equal('{"hello":"rocco"}');
            done();
        }, 1000);
    });

    it('should delete a single webHook URL', function(done) {
        webHooks.remove('hook1', URI + '/1/bbb').then(function(removed) {
            expect(removed).to.equal(true);
            done();
        }).catch(function(err) {
            done(err);
        });
    });

    it('should return false trying to delete a not existing webHook URL', function(done) {
        webHooks.remove('hook1', URI + '/1/bbb').then(function(removed) {
            expect(removed).to.equal(false);
            done();
        }).catch(function(err) {
            done(err);
        });
    });

    it('should return false trying to delete a not existing webHook', function(done) {
        webHooks.remove('not-existing').then(function(removed) {
            expect(removed).to.equal(false);
            done();
        }).catch(function(err) {
            done(err);
        });
    });

    it('fire the webHook and make sure just one URL is called', function(done) {
        OUTCOMES = {};
        webHooks.trigger('hook1');
        setTimeout(function() {
            should.exist(OUTCOMES['/1/aaa']);
            should.not.exist(OUTCOMES['/1/bbb']);
            expect(OUTCOMES['/1/aaa']).to.have.property('headers');
            expect(OUTCOMES['/1/aaa']).to.have.property('body').equal('');
            done();
        }, 1000);
    });

    it('should delete an entire webHook', function(done) {
        webHooks.remove('hook1').then(function(removed) {
            expect(removed).to.equal(true);
            done();
        }).catch(function(err) {
            done(err);
        });
    });

    it('should fire the deleted webHook and make sure no request is dispatched at all', function(done) {
        OUTCOMES = {};
        webHooks.trigger('hook1');
        setTimeout(function() {
            expect(OUTCOMES).to.deep.equal({});
            should.not.exist(OUTCOMES['/1/aaa']);
            should.not.exist(OUTCOMES['/1/bbb']);
            done();
        }, 1000);
    });

    it('should create a new webHook called hook2 for loadtest', function(done) {
        webHooks.add('hook2', URI + '/2/aaa').then(
            webHooks.add('hook2', URI + '/2/bbb').then(function() {
                done();
            })
        ).catch(function(err) {
            throw new Error(err);
        });
    });

    it('check webHooks were saved successfully using the .getWebHook method', function(done) {
        webHooks.getWebHook('hook2').then(function(obj) {
            debug('hook2:', obj);
            should.exist(obj);
            expect(obj.length).to.equal(2);
            expect(obj).to.have.members([URI + '/2/aaa', URI + '/2/bbb']);
            done();
        }).catch(function(err) {
            throw new Error(err);
        });
    });


    it('should fire the webHook 1000 times and 2000 REST calls are expected', function(done) {
        this.timeout(25 * 1000);
        // disabling debug to avoid console flooding
        //debug = function() {};

        for (var i = 1; i <= 1000; i++)
            (function(i) {
                webHooks.trigger('hook2', {
                    i: i
                });
            })(i);

        var loop = setInterval(function() {
            console.log('Got', LOADTEST + '/2000', 'REST calls');
            if (LOADTEST === 2000){
              clearInterval(loop);
              done();
            }
        }, 500);

    });


});

describe('Events >', function(){

    it('Should get the emitter', function(done){
        emitter = webHooks.getEmitter(); // get the emitter
        should.exist(emitter);
        done();
    });

    it('Should add a new Hook #3', function(done){
        webHooks.add('hook3', URI + '/3/aaa').then(function() {
            done();
        }).catch(function(err) {
            throw new Error(err);
        });
    });

    it('Should catch a specific success event', function(done){
        emitter.on('hook3.failure', function(shortname, stCode, body){
          debug('hook3.failure:', shortname, stCode, body);
          done('hook3.failure error: wrong event catched.');
        });
        emitter.on('hook3.success', function(shortname, statusCode, body){
          debug('hook3.success:', {shortname: shortname, statusCode: statusCode, body: body});
          should.exist(shortname);
          should.exist(statusCode);
          should.exist(body);
          shortname.should.equal('hook3');
          statusCode.should.equal(200);
          body.should.equal('Path Hit: /3/aaa'); // body response from the server
          done();
        });
        // fire the hook
          webHooks.trigger('hook3', {
              header1: 'pippo'
          }, {
              prop1 : 'paperino'
          });

    });

    it('Should remove the specific event listener and fire the hook', function(done){
        this.timeout(4000);
        emitter.removeAllListeners('hook3');
        emitter.on('hook3.success', function(s, st, body){
          debug('hook3.success error:', s, st, body);
          done('error: removed listener should not be called!');
        });
        emitter.removeAllListeners('hook3');
        webHooks.trigger('hook3');
        setTimeout(function(){
          done();
        }, 2000);
    });

    it('add a failing webHook called hook4', function(done){
      webHooks.add('hook4', URI + '/4/fail').then(function() {
          done();
      }).catch(function(err) {
          throw new Error(err);
      });
    });

    it('Should catch a specific failure event', function(done){
        emitter.on('hook4.success', function(){
          done('error: wrong event catched!');
        });
        emitter.on('hook4.failure', function(shortname, statusCode, body){
          should.exist(shortname);
          should.exist(statusCode);
          should.exist(body);
          shortname.should.equal('hook4');
          statusCode.should.equal(400);
          body.should.equal('Path Hit: /4/fail');
          done();
        });
        // fire the hook
        webHooks.trigger('hook4', {
            header1: 'foo'
        }, {
            prop2 : 'peterpan'
        });
    });

    it('Should add new hooks for multiple events catch', function(done){
        webHooks.add('hook5', URI + '/5/success').then(function() {
          webHooks.add('hook6', URI + '/6/success').then(function() {
            webHooks.add('hook7', URI + '/7/fail').then(function() {
              webHooks.add('hook8', URI + '/8/fail').then(function() {
                  done();
              });
            });
          });
        }).catch(function(err) {
            throw new Error(err);
        });
    });

    it('Should catch all the success events', function(done){
        var got = 0;
        emitter.on('*.failure', function(shortname, stCode, body){
          debug('error *.failure:', shortname, stCode, body);
          done('*.failure error: wrong event catched.');
        });
        emitter.on('*.success', function(shortname, statusCode, body){
          debug('captured events:', got);
          should.exist(shortname);
          should.exist(statusCode);
          should.exist(body);
          expect(shortname).to.be.oneOf(['hook5','hook6']);
          statusCode.should.equal(200);
          expect(body).to.be.oneOf(['Path Hit: /5/success', 'Path Hit: /6/success']);
          ++got;
          if (got === 2){
            emitter.removeAllListeners('*.success');
            emitter.removeAllListeners('*.failure');
            done();
          }
        });
        // fire the hooks
        webHooks.trigger('hook5');
        webHooks.trigger('hook6');
    });

    it('Should catch all the failure events', function(done){
        var got = 0;
        emitter.on('*.success', function(shortname, stCode, body){
          debug('error *.success:', shortname, stCode, body);
          done('*.success error: wrong event catched.');
        });
        emitter.on('*.failure', function(shortname, statusCode, body){
          debug('captured events:', got);
          should.exist(shortname);
          should.exist(statusCode);
          should.exist(body);
          expect(shortname).to.be.oneOf(['hook7','hook8']);
          statusCode.should.equal(400);
          expect(body).to.be.oneOf(['Path Hit: /7/fail', 'Path Hit: /8/fail']);
          ++got;
          if (got === 2){
            emitter.removeAllListeners('*.success');
            emitter.removeAllListeners('*.failure');
            done();
          }
        });
        // fire the hooks
        webHooks.trigger('hook7');
        webHooks.trigger('hook8');
    });


    after(function(done) {
        // stop the server
        server.close(function() {
            done();
        });
    });


});
