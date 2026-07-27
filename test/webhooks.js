const chai = require('chai')
const expect = chai.expect
const should = chai.should()
const debug = require('debug')('test-suite')
const http = require('http')
const fs = require('fs')
const path = require('path')
const WebHooks = require('../index')
let webHooks
let emitter
const DB_FILE = path.join(__dirname, './webHooksDB.json') // json file that store webhook URLs
const DB_OBJECT = {
  makeASound: ['http://localhost/beep'],
  flashALight: ['http://localhost/blink']
}

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
const PORT = 8000
const URI = `http://127.0.0.1:${PORT}`

let OUTCOMES = {}
let LOADTEST = 0

function handleRequest (request, response) {
  debug('called method:', request.method)
  debug('called URL:', request.url)
  debug('headers:', request.headers)
  const chunks = []
  request.on('data', (chunk) => {
    chunks.push(chunk)
  }).on('end', () => {
    const body = Buffer.concat(chunks).toString() // as string
    OUTCOMES[request.url] = {
      headers: request.headers,
      body
    }
    if (request.url.indexOf('/2/') !== -1) LOADTEST++
    debug('body:', body)
    if (request.url.indexOf('/fail') !== -1) { response.writeHead(400, { 'Content-Type': 'application/json' }) } else {
      response.writeHead(200, { 'Content-Type': 'application/json' })
    }
    response.end('Path Hit: ' + request.url)
  })
}

// Create a server
const server = http.createServer(handleRequest)

// To verify that basic CRUD operations work correctly both with in-memory and
// on-disk database, we use these functions with the two different settings
// below.

function addShortnameRequired (done) {
  try {
    webHooks.add(null, URI + '/1/aaa').then(() => {
      done('Error expected')
    }).catch((err) => {
      throw new Error(err)
    })
  } catch (e) {
    expect(e.message).to.equal('shortname required!')
    done()
  }
}

function addUrlRequired (done) {
  try {
    webHooks.add('hei', null).then(() => {
      done('Error expected')
    }).catch((err) => {
      throw new Error(err)
    })
  } catch (e) {
    expect(e.message).to.equal('Url must be a string')
    done()
  }
}

function removeShortnameRequired (done) {
  try {
    webHooks.remove(null, 'hei').then(() => {
      done('Error expected')
    }).catch((err) => {
      throw new Error(err)
    })
  } catch (e) {
    expect(e.message).to.equal('shortname required!')
    done()
  }
}

function getDBReturnsData (done) {
  webHooks.getDB().then((db) => {
    should.exist(db)
    done()
  }).catch((e) => {
    throw e
  })
}

function addWebhook1 (done) {
  webHooks.add('hook1', URI + '/1/aaa').then(() => {
    done()
  }).catch((err) => {
    throw new Error(err)
  })
}

function addUrlToHook1 (done) {
  webHooks.add('hook1', URI + '/1/bbb').then(() => {
    done()
  }).catch((err) => {
    throw new Error(err)
  })
}

function getWebhook1 (done) {
  webHooks.getWebHook('hook1').then((obj) => {
    should.exist(obj)
    expect(obj.length).to.equal(2)
    expect(obj).to.have.members([URI + '/1/aaa', URI + '/1/bbb'])
    done()
  }).catch((err) => {
    throw new Error(err)
  })
}

function deleteSingleUrl (done) {
  webHooks.remove('hook1', URI + '/1/bbb').then((removed) => {
    expect(removed).to.equal(true)
    done()
  }).catch((err) => {
    done(err)
  })
}

function deleteMissingUrl (done) {
  webHooks.remove('hook1', URI + '/1/bbb').then((removed) => {
    expect(removed).to.equal(false)
    done()
  }).catch((err) => {
    done(err)
  })
}

function deleteMissingHook (done) {
  webHooks.remove('not-existing').then((removed) => {
    expect(removed).to.equal(false)
    done()
  }).catch((err) => {
    done(err)
  })
}

function deleteMissingUrlFromMissingHook (done) {
  webHooks.remove('not-existing', URI + '/missing').then((removed) => {
    expect(removed).to.equal(false)
    done()
  }).catch((err) => {
    done(err)
  })
}

function deleteHook1 (done) {
  webHooks.remove('hook1').then((removed) => {
    expect(removed).to.equal(true)
    done()
  }).catch((err) => {
    done(err)
  })
}

describe('Tests >', function () {
  before(function (done) {
    // Lets start our server
    server.listen(PORT, () => {
      // Callback triggered when server is successfully listening. Hurray!
      debug('Server listening on: http://localhost:%s', PORT)
      done()
    })
  })

  it('create a node-webHooks instance with in-memory database', function (done) {
    webHooks = new WebHooks({
      db: DB_OBJECT
    })
    should.exist(webHooks)
    webHooks.should.be.an('object')
    done()
  })

  it('add: shortname required (in-memory DB)', addShortnameRequired)
  it('add: Url required (in-memory DB)', addUrlRequired)
  it('remove: shortname required (in-memory DB)', removeShortnameRequired)
  it('getDB() returns data (in-memory DB)', getDBReturnsData)
  it('add a webHook called hook1 (in-memory DB)', addWebhook1)
  it('add a new URL to the webHook hook1 (in-memory DB)', addUrlToHook1)
  it('should get the webHook using the .getWebHook method (in-memory DB)', getWebhook1)
  it('should delete a single webHook URL (in-memory DB)', deleteSingleUrl)
  it('should return false trying to delete a not existing webHook URL (in-memory DB)', deleteMissingUrl)
  it('should return false trying to delete a not existing webHook (in-memory DB)', deleteMissingHook)
  it('should return false trying to delete a URL from a not existing webHook (in-memory DB)', deleteMissingUrlFromMissingHook)
  it('should delete an entire webHook (in-memory DB)', deleteHook1)

  it('keeps listener references isolated across instances with the same URL', function (done) {
    this.timeout(3000)

    const sharedUrl = URI + '/shared'
    const firstWebHooks = new WebHooks({
      db: {
        shared: [sharedUrl]
      }
    })
    const secondWebHooks = new WebHooks({
      db: {
        shared: [sharedUrl]
      }
    })

    expect(firstWebHooks.getListeners()).to.not.equal(secondWebHooks.getListeners())

    firstWebHooks.remove('shared', sharedUrl).then((removed) => {
      expect(removed).to.equal(true)

      OUTCOMES = {}
      secondWebHooks.trigger('shared')
      setTimeout(() => {
        should.exist(OUTCOMES['/shared'])
        done()
      }, 250)
    }).catch((err) => {
      done(err)
    })
  })

  it('keeps listener references isolated across shortnames with the same URL', function (done) {
    this.timeout(3000)

    const sharedUrl = URI + '/shared-shortnames'
    const instance = new WebHooks({
      db: {
        first: [sharedUrl],
        second: [sharedUrl]
      }
    })

    instance.remove('first', sharedUrl).then((removed) => {
      expect(removed).to.equal(true)

      OUTCOMES = {}
      instance.trigger('first')
      setTimeout(() => {
        should.not.exist(OUTCOMES['/shared-shortnames'])

        instance.trigger('second')
        setTimeout(() => {
          should.exist(OUTCOMES['/shared-shortnames'])
          done()
        }, 250)
      }, 250)
    }).catch((err) => {
      done(err)
    })
  })

  it('delete old test DB file, if it exists', function (done) {
    try {
      fs.unlinkSync(DB_FILE)
    } catch (e) {}
    done()
  })

  it('create a node-webHooks instance with on-disk database', function (done) {
    webHooks = new WebHooks({
      db: DB_FILE
    })
    should.exist(webHooks)
    webHooks.should.be.an('object')
    done()
  })

  it('check wether the DB file exists or not', function (done) {
    fs.stat(DB_FILE, (err) => {
      should.not.exist(err)
      done()
    })
  })

  it('add: shortname required (on-disk DB)', addShortnameRequired)
  it('add: Url required (on-disk DB)', addUrlRequired)
  it('remove: shortname required (on-disk DB)', removeShortnameRequired)

  it('httpSuccessCodes is 200 by default', function (done) {
    expect(webHooks.httpSuccessCodes).to.deep.equal([200])
    done()
  })

  it('httpSuccessCodes accepts array only', function (done) {
    try {
      const a = new WebHooks({
        db: DB_FILE,
        httpSuccessCodes: null
      })
      done(a + ' should not be possible')
    } catch (e) {
      expect(e.message).to.equal('httpSuccessCodes must be an array')
      done()
    }
  })

  it('httpSuccessCodes accepts not empty array only', function (done) {
    try {
      const b = new WebHooks({
        db: DB_FILE,
        httpSuccessCodes: []
      })
      done(b + ' should not be possible')
    } catch (e) {
      expect(e.message).to.equal('httpSuccessCodes must contain at least one http status code')
      done()
    }
  })

  it('getDB() returns data (on-disk DB)', getDBReturnsData)
  it('add a webHook called hook1 (on-disk DB)', addWebhook1)
  it('add a new URL to the webHook hook1 (on-disk DB)', addUrlToHook1)
  it('should get the webHook using the .getWebHook method (on-disk DB)', getWebhook1)

  it('should fire the webHook with no body or headers', function (done) {
    this.timeout(3000)
    webHooks.trigger('hook1')
    setTimeout(() => {
      debug('OUTCOME-1:', OUTCOMES)
      should.exist(OUTCOMES['/1/aaa'])
      should.exist(OUTCOMES['/1/bbb'])
      expect(OUTCOMES['/1/aaa']).to.have.property('headers')
      expect(OUTCOMES['/1/aaa']).to.have.property('body').equal('')
      expect(OUTCOMES['/1/bbb']).to.have.property('headers')
      expect(OUTCOMES['/1/bbb']).to.have.property('body').equal('')
      done()
    }, 1000)
  })

  it('should fire the webHook with custom body', function (done) {
    this.timeout(3000)
    OUTCOMES = {}
    webHooks.trigger('hook1', {
      hello: 'world'
    })
    setTimeout(() => {
      debug('OUTCOME-2:', OUTCOMES)
      should.exist(OUTCOMES['/1/aaa'])
      should.exist(OUTCOMES['/1/bbb'])
      expect(OUTCOMES['/1/aaa']).to.have.property('headers')
      expect(OUTCOMES['/1/aaa']).to.have.property('body').equal('{"hello":"world"}')
      expect(OUTCOMES['/1/bbb']).to.have.property('headers')
      expect(OUTCOMES['/1/bbb']).to.have.property('body').equal('{"hello":"world"}')
      done()
    }, 1000)
  })

  it('should fire the webHook with custom headers', function (done) {
    this.timeout(3000)
    OUTCOMES = {}
    webHooks.trigger('hook1', {}, {
      hero: 'hulk'
    })
    setTimeout(() => {
      debug('OUTCOME-3:', OUTCOMES)
      should.exist(OUTCOMES['/1/aaa'])
      should.exist(OUTCOMES['/1/bbb'])
      expect(OUTCOMES['/1/aaa']).to.have.nested.property('headers.hero').equal('hulk')
      expect(OUTCOMES['/1/aaa']).to.have.property('body').equal('{}')
      expect(OUTCOMES['/1/bbb']).to.have.nested.property('headers.hero').equal('hulk')
      expect(OUTCOMES['/1/bbb']).to.have.property('body').equal('{}')
      done()
    }, 1000)
  })

  it('should fire the webHook with both custom body and headers', function (done) {
    this.timeout(3000)
    OUTCOMES = {}
    webHooks.trigger('hook1', {
      hello: 'rocco'
    }, {
      hero: 'iron-man'
    })
    setTimeout(() => {
      debug('OUTCOME-3:', OUTCOMES)
      should.exist(OUTCOMES['/1/aaa'])
      should.exist(OUTCOMES['/1/bbb'])
      expect(OUTCOMES['/1/aaa']).to.have.nested.property('headers.hero').equal('iron-man')
      expect(OUTCOMES['/1/aaa']).to.have.property('body').equal('{"hello":"rocco"}')
      expect(OUTCOMES['/1/bbb']).to.have.nested.property('headers.hero').equal('iron-man')
      expect(OUTCOMES['/1/bbb']).to.have.property('body').equal('{"hello":"rocco"}')
      done()
    }, 1000)
  })

  it('should delete a single webHook URL (on-disk DB)', deleteSingleUrl)
  it('should return false trying to delete a not existing webHook URL (on-disk DB)', deleteMissingUrl)
  it('should return false trying to delete a not existing webHook (on-disk DB)', deleteMissingHook)
  it('should return false trying to delete a URL from a not existing webHook (on-disk DB)', deleteMissingUrlFromMissingHook)

  it('fire the webHook and make sure just one URL is called', function (done) {
    OUTCOMES = {}
    webHooks.trigger('hook1')
    setTimeout(() => {
      should.exist(OUTCOMES['/1/aaa'])
      should.not.exist(OUTCOMES['/1/bbb'])
      expect(OUTCOMES['/1/aaa']).to.have.property('headers')
      expect(OUTCOMES['/1/aaa']).to.have.property('body').equal('')
      done()
    }, 1000)
  })

  it('should delete an entire webHook (on-disk DB)', deleteHook1)

  it('should fire the deleted webHook and make sure no request is dispatched at all', function (done) {
    OUTCOMES = {}
    webHooks.trigger('hook1')
    setTimeout(() => {
      expect(OUTCOMES).to.deep.equal({})
      should.not.exist(OUTCOMES['/1/aaa'])
      should.not.exist(OUTCOMES['/1/bbb'])
      done()
    }, 1000)
  })

  it('should create a new webHook called hook2 for loadtest', function (done) {
    webHooks.add('hook2', URI + '/2/aaa').then(
      webHooks.add('hook2', URI + '/2/bbb').then(() => {
        done()
      })
    ).catch((err) => {
      throw new Error(err)
    })
  })

  it('check webHooks were saved successfully using the .getWebHook method', function (done) {
    webHooks.getWebHook('hook2').then((obj) => {
      debug('hook2:', obj)
      should.exist(obj)
      expect(obj.length).to.equal(2)
      expect(obj).to.have.members([URI + '/2/aaa', URI + '/2/bbb'])
      done()
    }).catch((err) => {
      throw new Error(err)
    })
  })

  it('should fire the webHook 1000 times and 2000 REST calls are expected', function (done) {
    this.timeout(30 * 1000)

    const totalTriggers = 1000
    const batchSize = 50
    let sent = 0
    LOADTEST = 0

    function sendBatch () {
      const batchEnd = Math.min(sent + batchSize, totalTriggers)
      for (let i = sent + 1; i <= batchEnd; i++) {
        webHooks.trigger('hook2', {
          i
        })
      }
      sent = batchEnd
    }

    const loop = setInterval(() => {
      console.log('Got', LOADTEST + '/2000', 'REST calls')
      if (LOADTEST === sent * 2 && sent < totalTriggers) {
        sendBatch()
      } else if (LOADTEST === 2000) {
        clearInterval(loop)
        done()
      }
    }, 500)

    sendBatch()
  })
})

describe('Events >', function () {
  it('Should get the emitter', function (done) {
    emitter = webHooks.getEmitter() // get the emitter
    should.exist(emitter)
    done()
  })

  it('Should get all the listeners func.', function (done) {
    should.exist(webHooks.getListeners()) // get the callbacks obj
    done()
  })

  it('Should add a new Hook #3', function (done) {
    webHooks.add('hook3', URI + '/3/aaa').then(() => {
      done()
    }).catch((err) => {
      throw new Error(err)
    })
  })

  it('Should catch a specific success event', function (done) {
    emitter.on('hook3.failure', (shortname, stCode, body) => {
      debug('hook3.failure:', shortname, stCode, body)
      done('hook3.failure error: wrong event catched.')
    })
    emitter.on('hook3.success', (shortname, statusCode, body) => {
      debug('hook3.success:', { shortname, statusCode, body })
      should.exist(shortname)
      should.exist(statusCode)
      should.exist(body)
      shortname.should.equal('hook3')
      statusCode.should.equal(200)
      body.should.equal('Path Hit: /3/aaa') // body response from the server
      done()
    })
    // fire the hook
    webHooks.trigger('hook3', {
      header1: 'pippo'
    }, {
      prop1: 'paperino'
    })
  })

  it('Should remove the specific event listener and fire the hook', function (done) {
    this.timeout(4000)
    emitter.removeAllListeners('hook3')
    emitter.on('hook3.success', (s, st, body) => {
      debug('hook3.success error:', s, st, body)
      done('error: removed listener should not be called!')
    })
    emitter.removeAllListeners('hook3')
    webHooks.trigger('hook3')
    setTimeout(() => {
      done()
    }, 2000)
  })

  it('add a failing webHook called hook4', function (done) {
    webHooks.add('hook4', URI + '/4/fail').then(() => {
      done()
    }).catch((err) => {
      throw new Error(err)
    })
  })

  it('Should catch a specific failure event', function (done) {
    emitter.on('hook4.success', () => {
      done('error: wrong event catched!')
    })
    emitter.on('hook4.failure', (shortname, statusCode, body) => {
      should.exist(shortname)
      should.exist(statusCode)
      should.exist(body)
      shortname.should.equal('hook4')
      statusCode.should.equal(400)
      body.should.equal('Path Hit: /4/fail')
      done()
    })
    // fire the hook
    webHooks.trigger('hook4', {
      header1: 'foo'
    }, {
      prop2: 'peterpan'
    })
  })

  it('Should add new hooks for multiple events catch', function (done) {
    webHooks.add('hook5', URI + '/5/success').then(() => {
      webHooks.add('hook6', URI + '/6/success').then(() => {
        webHooks.add('hook7', URI + '/7/fail').then(() => {
          webHooks.add('hook8', URI + '/8/fail').then(() => {
            done()
          })
        })
      })
    }).catch((err) => {
      throw new Error(err)
    })
  })

  it('Should catch all the success events', function (done) {
    let got = 0
    emitter.on('*.failure', (shortname, stCode, body) => {
      debug('error *.failure:', shortname, stCode, body)
      done('*.failure error: wrong event catched.')
    })
    emitter.on('*.success', (shortname, statusCode, body) => {
      debug('captured events:', got)
      should.exist(shortname)
      should.exist(statusCode)
      should.exist(body)
      expect(shortname).to.be.oneOf(['hook5', 'hook6'])
      statusCode.should.equal(200)
      expect(body).to.be.oneOf(['Path Hit: /5/success', 'Path Hit: /6/success'])
      ++got
      if (got === 2) {
        emitter.removeAllListeners('*.success')
        emitter.removeAllListeners('*.failure')
        done()
      }
    })
    // fire the hooks
    webHooks.trigger('hook5')
    webHooks.trigger('hook6')
  })

  it('Should catch all the failure events', function (done) {
    let got = 0
    emitter.on('*.success', (shortname, stCode, body) => {
      debug('error *.success:', shortname, stCode, body)
      done('*.success error: wrong event catched.')
    })
    emitter.on('*.failure', (shortname, statusCode, body) => {
      debug('captured events:', got)
      should.exist(shortname)
      should.exist(statusCode)
      should.exist(body)
      expect(shortname).to.be.oneOf(['hook7', 'hook8'])
      statusCode.should.equal(400)
      expect(body).to.be.oneOf(['Path Hit: /7/fail', 'Path Hit: /8/fail'])
      ++got
      if (got === 2) {
        emitter.removeAllListeners('*.success')
        emitter.removeAllListeners('*.failure')
        done()
      }
    })
    // fire the hooks
    webHooks.trigger('hook7')
    webHooks.trigger('hook8')
  })

  after(function (done) {
    // stop the server
    server.close(() => {
      done()
    })
  })
})
