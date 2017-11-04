/*
Author @ Rocco Musolino

DB Structure Example:

{
  "shortname1": [url1, url2, ...],
  "shortname2": [url3, url4, ...],
   ...
   ...
  "shortnameX": [urlZ, ...]
}

*/

var debug = require('debug')('node-webhooks')
var Promise = require('bluebird') // for backward compatibility
var _ = require('lodash')
var jsonfile = require('jsonfile')
var fs = require('fs')
var crypto = require('crypto')
var request = require('request')
var events = require('eventemitter2')

// will contain all the functions. We need to store them to be able to remove the listener callbacks
var _functions = {}

// WebHooks Class
function WebHooks (options) {
  if (typeof options !== 'object') throw new TypeError('Expected an Object')
  if (typeof options.db !== 'string' && typeof options.db !== 'object') {
    throw new TypeError('db Must be a String path or an object')
  }

  this.db = options.db

  // If webhooks data is kept in memory, we skip all disk operations
  this.isMemDb = typeof options.db === 'object'

  if (options.hasOwnProperty('httpSuccessCodes')) {
    if (!(options.httpSuccessCodes instanceof Array)) throw new TypeError('httpSuccessCodes must be an array')
    if (options.httpSuccessCodes.length <= 0) throw new TypeError('httpSuccessCodes must contain at least one http status code')

    this.httpSuccessCodes = options.httpSuccessCodes
  } else {
    this.httpSuccessCodes = [200]
  }

  this.emitter = new events.EventEmitter2({ wildcard: true })

  var self = this

  if (this.isMemDb) {
    debug('setting listeners based on provided configuration object...')
    _setListeners(self)
  } else {
    // sync loading:
    try {
      fs.accessSync(this.db, fs.R_OK | fs.W_OK)
      // DB already exists, set listeners for every URL.
      debug('webHook DB loaded, setting listeners...')
      _setListeners(self)
    } catch (e) {
      // DB file not found, initialize it
      if (e.hasOwnProperty('code')) {
        if (e.code === 'ENOENT') {
          // file not found, init DB:
          debug('webHook DB init')
          _initDB(self.db)
        } else console.error(e)
      } else console.error(e)
    }
  }
}

function _initDB (file) {
  // init DB.
  var db = {} // init empty db
  jsonfile.writeFileSync(file, db, {spaces: 2})
}

function _setListeners (self) {
  // set Listeners - sync method

  try {
    var obj = self.isMemDb ? self.db : jsonfile.readFileSync(self.db)
    if (!obj) throw Error('can\'t read webHook DB content')

    for (var key in obj) {
      // skip loop if the property is from prototype
      if (!obj.hasOwnProperty(key)) continue

      var urls = obj[key]
      urls.forEach(function (url) {
        var encUrl = crypto.createHash('md5').update(url).digest('hex')
        _functions[encUrl] = _getRequestFunction(self, url)
        self.emitter.on(key, _functions[encUrl])
      })
    }
  } catch (e) {
    throw Error(e)
  }

  // console.log(_functions[0] == _functions[1]);
  // console.log(_functions[1] == _functions[2]);
  // console.log(_functions[0] == _functions[2]);
}

function _getRequestFunction (self, url) {
  // return the function then called by the event listener.
  var func = function (shortname, jsonData, headersData) { // argument required when eventEmitter.emit()
    var obj = {'Content-Type': 'application/json'}
    var headers = headersData ? _.merge(obj, headersData) : obj

    debug('POST request to:', url)
    // POST request to the instantiated URL with custom headers if provided
    request({
      method: 'POST',
      uri: url,
      strictSSL: false,
      headers: headers,
      body: JSON.stringify(jsonData)
    },
    function (error, response, body) {
      var statusCode = response ? response.statusCode : null
      body = body || null
      debug('Request sent - Server responded with:', statusCode, body)

      if ((error || self.httpSuccessCodes.indexOf(statusCode) === -1)) {
        self.emitter.emit(shortname + '.failure', shortname, statusCode, body)
        return debug('HTTP failed: ' + error)
      }

      self.emitter.emit(shortname + '.success', shortname, statusCode, body)
    }
      )
  }

  return func
}

// 'prototype' has improved performances, let's declare the methods

WebHooks.prototype.trigger = function (shortname, jsonData, headersData) {
  // trigger a webHook
  this.emitter.emit(shortname, shortname, jsonData, headersData)
}

WebHooks.prototype.add = function (shortname, url) { // url is required
  // add a new webHook.
  if (typeof shortname !== 'string') throw new TypeError('shortname required!')
  if (typeof url !== 'string') throw new TypeError('Url must be a string')

  var self = this
  return new Promise(function (resolve, reject) {
    try {
      var obj = self.isMemDb ? self.db : jsonfile.readFileSync(self.db)
      if (!obj) throw Error('can\'t read webHook DB content')

      var modified = false
      var encUrl
      if (obj[shortname]) {
          // shortname already exists
        if (obj[shortname].indexOf(url) === -1) {
            // url doesn't exists for given shortname
          debug('url added to an existing shortname!')
          obj[shortname].push(url)
          encUrl = crypto.createHash('md5').update(url).digest('hex')
          _functions[encUrl] = _getRequestFunction(self, url)
          self.emitter.on(shortname, _functions[encUrl])
          modified = true
        }
      } else {
          // new shortname
        debug('new shortname!')
        obj[shortname] = [url]
        encUrl = crypto.createHash('md5').update(url).digest('hex')
        _functions[encUrl] = _getRequestFunction(self, url)
        self.emitter.on(shortname, _functions[encUrl])
        modified = true
      }

        // actualize DB
      if (modified) {
        if (!self.isMemDb) jsonfile.writeFileSync(self.db, obj)
        resolve(true)
      } else resolve(false)
    } catch (e) {
      reject(e)
    }
  })
}

WebHooks.prototype.remove = function (shortname, url) { // url is optional
  // if url exists remove only the url attached to the selected webHook.
  // else remove the webHook and all the attached URLs.
  if (typeof shortname !== 'string') {
    throw new TypeError('shortname required!')
  }
  var self = this
  return new Promise(function (resolve, reject) {
    // Basically removeListener will look up the given function by reference, if it found that function it will remove it from the event hander.
    try {
      if (typeof url !== 'undefined') {
        // save in db
        _removeUrlFromShortname(self, shortname, url, function (err, done) {
          if (err) return reject(err)
          if (done) {
            // remove only the specified url
            var urlKey = crypto.createHash('md5').update(url).digest('hex')
            self.emitter.removeListener(shortname, _functions[urlKey])
            delete _functions[urlKey]
            resolve(true)
          } else resolve(false)
        })
      } else {
        // remove every event listener attached to the webHook shortname.
        self.emitter.removeAllListeners(shortname)

        // delete all the callbacks in _functions for the specified shortname. Let's loop over the url taken from the DB.
        var obj = self.isMemDb ? self.db : jsonfile.readFileSync(self.db)

        if (obj.hasOwnProperty(shortname)) {
          var urls = obj[shortname]
          urls.forEach(function (url) {
            var urlKey = crypto.createHash('md5').update(url).digest('hex')
            delete _functions[urlKey]
          })

          // save it back to the DB
          _removeShortname(self, shortname, function (err) {
            if (err) return reject(err)
            resolve(true)
          })
        } else {
          debug('webHook doesn\'t exist')
          resolve(false)
        }
      }
    } catch (e) {
      reject(e)
    }
  })
}

function _removeUrlFromShortname (self, shortname, url, callback) {
  try {
    var obj = self.isMemDb ? self.db : jsonfile.readFileSync(self.db)

    var deleted = false
    var len = obj[shortname].length
    if (obj[shortname].indexOf(url) !== -1) {
      obj[shortname].splice(obj[shortname].indexOf(url), 1)
    }
    if (obj[shortname].length !== len) deleted = true
      // save it back to the DB
    if (deleted) {
      if (!self.isMemDb) jsonfile.writeFileSync(self.db, obj)
      debug('url removed from existing shortname')
      callback(null, deleted)
    } else callback(null, deleted)
  } catch (e) {
    callback(e, null)
  }
}

function _removeShortname (self, shortname, callback) {
  try {
    var obj = self.isMemDb ? self.db : jsonfile.readFileSync(self.db)
    delete obj[shortname]
    // save it back to the DB
    if (!self.isMemDb) jsonfile.writeFileSync(self.db, obj)
    debug('whole shortname urls removed')
    callback(null)
  } catch (e) {
    callback(e)
  }
}

// async method
WebHooks.prototype.getDB = function () {
  // return the whole JSON DB file.
  var self = this
  return new Promise(function (resolve, reject) {
    if (self.isMemDb) resolve(self.db)
    jsonfile.readFile(self.db, function (err, obj) {
      if (err) {
        reject(err) // file not found
      } else {
        resolve(obj) // file exists
      }
    })
  })
}

// async method
WebHooks.prototype.getWebHook = function (shortname) {
  // return the selected WebHook.
  var self = this
  return new Promise(function (resolve, reject) {
    if (self.isMemDb) {
      resolve(self.db[shortname] || {})
    } else {
      jsonfile.readFile(self.db, function (err, obj) {
        if (err) {
          reject(err) // file not found
        } else {
          resolve(obj[shortname] || {}) // file exists
        }
      })
    }
  })
}

WebHooks.prototype.getListeners = function () {
  return _functions
}

WebHooks.prototype.getEmitter = function () {
  return this.emitter
}

module.exports = WebHooks
