var fs = require('fs')
var debug = require('debug')('storage')

// Constructor
function Storage (bar) {
    // always initialize all instance properties
  this._discovered = false
  this.storageTypes = {}
    // discover inspects storage folder and register all its modules
  this.discover = function (cb) {
    var path = require('path')
    var directory = path.join(__dirname, 'storage')
    debug('Reading storage from ' + directory)
    fs.readdir(directory, function (err, items) {
      if (err) {
        debug(err)
        return
      }
        // debug('Storage items ', items)
      items.forEach(function (implementation) {
        const modulePath = directory + '/' + implementation
        const module = require(modulePath)
        this.storageTypes[module.name] = module
      }.bind(this))
      this._discovered = true
      cb && cb(this)
    }.bind(this))
  }
}
// class methods

Storage.prototype.get = function (name, options) {
    // has not been read yet
  if (!this._discovered) {
    return new Promise(function (resolve, reject) {
      this.discover(function () {
        resolve(this.storageTypes[name].setup(options))
      }.bind(this))
    }.bind(this))
  } else {
    return this.storageTypes[name].setup(options)
  }
}

// export the class
module.exports = new Storage()
