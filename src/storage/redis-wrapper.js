var redis = require('redis')
var debug = require('debug')('redis-wrapper')

class ImplementationOf {
  constructor (clientObject) {
    this.client = clientObject
  }

  get (name, cb) {
    return this.client.get(name, function (err, reply) {
      if (!err) {
        const value = JSON.parse(reply)
        cb(value)
      } else {
        cb(err)
      }
    })
  }

  set (name, value, cb) {
    value = JSON.stringify(value)
    this.client.set(name, value, cb)
    return this
  }

  add (name, value, cb) {
    value = JSON.stringify(value)
    this.client.sadd(name, value, cb)
    return this
  }

  batch () {
    return this.client.batch()
  }
}

var setup = function (options) {
  return new Promise(function (resolve, reject) {
    var client = redis.createClient(options)
    client.on('connect', function (event) {
      debug('Connection Success')
            // client.unref()
      resolve(new ImplementationOf(client))
    })
    client.on('error', function (err) {
      console.log('Error ' + err)
      reject && reject(err)
    })
  })
}

module.exports = {name: 'redis', setup}
