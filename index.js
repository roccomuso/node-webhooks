'use strict'

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

const debug = require('debug')('node-webhooks')
const jsonfile = require('jsonfile')
const fs = require('fs')
const crypto = require('crypto')
const { EventEmitter2 } = require('eventemitter2')

function getListenerKey (shortname, url) {
  return crypto.createHash('md5').update(shortname + '\n' + url).digest('hex')
}

function initDB (file) {
  // init DB.
  const db = {} // init empty db
  jsonfile.writeFileSync(file, db, { spaces: 2 })
}

function setListeners (self) {
  // set Listeners - sync method
  try {
    const obj = self.isMemDb ? self.db : jsonfile.readFileSync(self.db)
    if (!obj) throw new Error('can\'t read webHook DB content')

    for (const key of Object.keys(obj)) {
      const urls = obj[key]
      urls.forEach((url) => {
        const encUrl = getListenerKey(key, url)
        self._functions[encUrl] = getRequestFunction(self, url)
        self.emitter.on(key, self._functions[encUrl])
      })
    }
  } catch (e) {
    throw e instanceof Error ? e : new Error(e)
  }
}

function getRequestFunction (self, url) {
  // return the function then called by the event listener.
  return async function (shortname, jsonData, headersData) { // argument required when eventEmitter.emit()
    const headers = Object.assign({ 'Content-Type': 'application/json' }, headersData)

    debug('POST request to:', url)

    let response
    try {
      // POST request to the instantiated URL with custom headers if provided
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(jsonData)
      })
    } catch (error) {
      debug('HTTP failed:', error.message)
      self.emitter.emit(`${shortname}.failure`, shortname, null, null)
      return
    }

    const statusCode = response.status
    const body = await response.text()
    debug('Request sent - Server responded with:', statusCode, body)

    if (self.httpSuccessCodes.indexOf(statusCode) === -1) {
      self.emitter.emit(`${shortname}.failure`, shortname, statusCode, body)
      return
    }

    self.emitter.emit(`${shortname}.success`, shortname, statusCode, body)
  }
}

function removeUrlFromShortname (self, shortname, url, callback) {
  try {
    const obj = self.isMemDb ? self.db : jsonfile.readFileSync(self.db)

    let deleted = false
    if (!Object.prototype.hasOwnProperty.call(obj, shortname)) {
      return callback(null, deleted)
    }

    const len = obj[shortname].length
    const idx = obj[shortname].indexOf(url)
    if (idx !== -1) obj[shortname].splice(idx, 1)
    if (obj[shortname].length !== len) deleted = true

    // save it back to the DB
    if (deleted) {
      if (!self.isMemDb) jsonfile.writeFileSync(self.db, obj)
      debug('url removed from existing shortname')
    }
    callback(null, deleted)
  } catch (e) {
    callback(e, null)
  }
}

function removeShortname (self, shortname, callback) {
  try {
    const obj = self.isMemDb ? self.db : jsonfile.readFileSync(self.db)
    delete obj[shortname]
    // save it back to the DB
    if (!self.isMemDb) jsonfile.writeFileSync(self.db, obj)
    debug('whole shortname urls removed')
    callback(null)
  } catch (e) {
    callback(e)
  }
}

class WebHooks {
  constructor (options) {
    if (!options || typeof options !== 'object') throw new TypeError('Expected an Object')
    if (typeof options.db !== 'string' && typeof options.db !== 'object') {
      throw new TypeError('db Must be a String path or an object')
    }

    this.db = options.db

    // If webhooks data is kept in memory, we skip all disk operations
    this.isMemDb = typeof options.db === 'object'

    if (Object.prototype.hasOwnProperty.call(options, 'httpSuccessCodes')) {
      if (!Array.isArray(options.httpSuccessCodes)) throw new TypeError('httpSuccessCodes must be an array')
      if (options.httpSuccessCodes.length <= 0) throw new TypeError('httpSuccessCodes must contain at least one http status code')

      this.httpSuccessCodes = options.httpSuccessCodes
    } else {
      this.httpSuccessCodes = [200]
    }

    this.emitter = new EventEmitter2({ wildcard: true })
    // A shortname can have any number of URLs attached, each backed by its own
    // listener on the same event name: don't warn when that number grows past 10.
    this.emitter.setMaxListeners(0)
    // Store listener callbacks per instance so they can be removed by reference.
    this._functions = {}

    if (this.isMemDb) {
      debug('setting listeners based on provided configuration object...')
      setListeners(this)
    } else {
      // sync loading:
      try {
        fs.accessSync(this.db, fs.constants.R_OK | fs.constants.W_OK)
        // DB already exists, set listeners for every URL.
        debug('webHook DB loaded, setting listeners...')
        setListeners(this)
      } catch (e) {
        // DB file not found, initialize it
        if (e.code === 'ENOENT') {
          // file not found, init DB:
          debug('webHook DB init')
          initDB(this.db)
        } else throw e
      }
    }
  }

  trigger (shortname, jsonData, headersData) {
    // trigger a webHook
    this.emitter.emit(shortname, shortname, jsonData, headersData)
  }

  add (shortname, url) { // url is required
    // add a new webHook.
    if (typeof shortname !== 'string') throw new TypeError('shortname required!')
    if (typeof url !== 'string') throw new TypeError('Url must be a string')

    const self = this
    return new Promise((resolve, reject) => {
      try {
        const obj = self.isMemDb ? self.db : jsonfile.readFileSync(self.db)
        if (!obj) throw new Error('can\'t read webHook DB content')

        let modified = false
        let encUrl
        if (obj[shortname]) {
          // shortname already exists
          if (obj[shortname].indexOf(url) === -1) {
            // url doesn't exists for given shortname
            debug('url added to an existing shortname!')
            obj[shortname].push(url)
            encUrl = getListenerKey(shortname, url)
            self._functions[encUrl] = getRequestFunction(self, url)
            self.emitter.on(shortname, self._functions[encUrl])
            modified = true
          }
        } else {
          // new shortname
          debug('new shortname!')
          obj[shortname] = [url]
          encUrl = getListenerKey(shortname, url)
          self._functions[encUrl] = getRequestFunction(self, url)
          self.emitter.on(shortname, self._functions[encUrl])
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

  remove (shortname, url) { // url is optional
    // if url exists remove only the url attached to the selected webHook.
    // else remove the webHook and all the attached URLs.
    if (typeof shortname !== 'string') {
      throw new TypeError('shortname required!')
    }
    const self = this
    return new Promise((resolve, reject) => {
      // Basically removeListener will look up the given function by reference, if it found that function it will remove it from the event hander.
      try {
        if (typeof url !== 'undefined') {
          // save in db
          removeUrlFromShortname(self, shortname, url, (err, done) => {
            if (err) return reject(err)
            if (done) {
              // remove only the specified url
              const urlKey = getListenerKey(shortname, url)
              self.emitter.removeListener(shortname, self._functions[urlKey])
              delete self._functions[urlKey]
              resolve(true)
            } else resolve(false)
          })
        } else {
          // remove every event listener attached to the webHook shortname.
          self.emitter.removeAllListeners(shortname)

          // delete all the callbacks in _functions for the specified shortname. Let's loop over the url taken from the DB.
          const obj = self.isMemDb ? self.db : jsonfile.readFileSync(self.db)

          if (Object.prototype.hasOwnProperty.call(obj, shortname)) {
            const urls = obj[shortname]
            urls.forEach((u) => {
              const urlKey = getListenerKey(shortname, u)
              delete self._functions[urlKey]
            })

            // save it back to the DB
            removeShortname(self, shortname, (err) => {
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

  // async method
  getDB () {
    // return the whole JSON DB file.
    const self = this
    return new Promise((resolve, reject) => {
      if (self.isMemDb) return resolve(self.db)
      jsonfile.readFile(self.db, (err, obj) => {
        if (err) {
          reject(err) // file not found
        } else {
          resolve(obj) // file exists
        }
      })
    })
  }

  // async method
  getWebHook (shortname) {
    // return the selected WebHook.
    const self = this
    return new Promise((resolve, reject) => {
      if (self.isMemDb) {
        resolve(self.db[shortname] || [])
      } else {
        jsonfile.readFile(self.db, (err, obj) => {
          if (err) {
            reject(err) // file not found
          } else {
            resolve(obj[shortname] || []) // file exists
          }
        })
      }
    })
  }

  getListeners () {
    return this._functions
  }

  getEmitter () {
    return this.emitter
  }
}

module.exports = WebHooks
