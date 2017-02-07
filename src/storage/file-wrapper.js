var debug = require('debug')('file-wrapper')
var jsonfile = require('jsonfile')

class ImplementationOf {
  constructor (filename) {
    this._readOnce = false
    this._cache = {'dictionary': ''}
    this.filename = filename
  }

  get (name, cb) {
    if (!this._readOnce) {
      var obj = jsonfile.readFileSync(this.filename)
      this._cache = obj || {}
      this._readOnce = true
      cb(obj && name in obj ? obj[name] : {}, false)
    } else {
      cb(this._cache[name] || {})
    }
  }

  set (name, value, cb) {
    this._cache[name] = value
    jsonfile.writeFile(this.filename, this._cache, {spaces: 2}, function () {
      cb()
    })
    return this
  }

  add (name, value, cb) {
    this._cache[name] = value
    debug('add', name, value)
    jsonfile.writeFile(this.filename, this._cache, {spaces: 2}, cb)
    return this
  }

  batch () {
    return null
  }
}

var setup = function (options) {
  return new Promise(function (resolve, reject) {
    try {
      jsonfile.readFileSync(options.filename)
      resolve(new ImplementationOf(options.filename))
    } catch (e) {
      // DB file not found, initialize it
      if (e.hasOwnProperty('code')) {
        if (e.code === 'ENOENT') {
          // file not found, init DB:
          debug('webHook DB init')
          jsonfile.writeFile(options.filename, {}, {spaces: 2}, function () {
            resolve(new ImplementationOf(options.filename))
          })
        } else {
          console.error(e)
        }
      } else {
        resolve(new ImplementationOf(options.filename))
      }
    }
  })
}

module.exports = {name: 'file', setup}
