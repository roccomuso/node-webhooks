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
var co = require('co')
var _ = require('lodash')
var fs = require('fs')
var crypto = require('crypto')
var request = require('request')
var events = require('eventemitter2')

// will contain all the functions. We need to store them to be able to remove the listener callbacks
var _functions = {}

// WebHooks Class
function WebHooks(options) {
    if (typeof options !== 'object') throw new TypeError('Expected an Object')
    //if (typeof options.db !== 'string') throw new TypeError('db Must be a String path')

    this.storage = options.storage

    this.emitter = new events.EventEmitter2({wildcard: true})

    var self = this

    self.ready = function () {
        return new Promise(function (resolve, reject) {
            // sync loading:
            try {

                self.storage.then(function (storageWrapper) {
                    //debug('storageWrapper', storageWrapper);
                    self.storage = storageWrapper;
                    _setListeners.apply(self, []);
                    resolve();
                }).catch(function (err) {
                    console.log(err);
                });

            } catch (e) {

                reject(e);
                console.error(e)
            }
        });
    };

    self.getDictionary = function (cb) {
        this.storage.get('dictionary', function (reply, err) {
            cb(reply, err);
        });
    }.bind(self);
}

function _setListeners() {
    // set Listeners - sync method
    var self = this;
    try {
        self.getDictionary(function (reply, err) {
            var obj = reply;

            for (var key in obj) {
                // skip loop if the property is from prototype
                if (!obj.hasOwnProperty(key)) {
                    continue;
                } else {
                    bindUriEvents.apply(self, [key, obj[key]]);
                }
            }
        });
    } catch (e) {
        throw Error(e)
    }
}

function bindUriEvents(key, urls) {
    var self = this;
    debug('Binding ' + key + ' event');
    urls.forEach(function (url) {
        var encUrl = crypto.createHash('md5').update(url).digest('hex')
        _functions[encUrl] = _getRequestFunction(self, url)
        self.emitter.on(key, function () {
            debug(key + ' has been catched');
            _functions[encUrl]();
        })
    })
}
function _getRequestFunction(self, url, method) {
    // return the function then called by the event listener.
    var func = function (shortname, jsonData, headersData) { // argument required when eventEmitter.emit()
        var obj = {'Content-Type': 'application/json'}
        var headers = headersData ? _.merge(obj, headersData) : obj

        debug(' Request to:', url)
        // POST request to the instantiated URL with custom headers if provided
        request({
                method: method || 'POST',
                uri: url,
                strictSSL: false,
                headers: headers,
                body: JSON.stringify(jsonData)
            },
            function (error, response, body) {
                var statusCode = response ? response.statusCode : null
                body = body || null
                debug('Request sent - Server responded with:', statusCode, body)

                if ((error || statusCode !== 200)) {
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

WebHooks.prototype.exists = function (shortname, cb) {
    this.storage.get(shortname, function (reply, err) {
        debug(shortname, reply, err);
        cb(reply != null);
    })
};

WebHooks.prototype.multi = function (objects) {
    const self = this;
    return new Promise(function (resolve, reject) {
        co(function *() {
            var commands = [];
            var promises = [];
            for (var key in objects) {
                const value = objects[key];
                let promise = yield self.add(value.name, value.url);
                promises.push(promise);
            }
            resolve(true);
        }).catch(function (err) {
            debug(err);
            reject(false);
        });
    })
};

WebHooks.prototype.add = function (shortname, url) { // url is required
    // add a new webHook.
    if (typeof shortname !== 'string') throw new TypeError('shortname required!')
    if (typeof url !== 'string') throw new TypeError('Url must be a string')
    return new Promise(function (resolve, reject) {
        try {
            this.getDictionary(function (reply, err) {

                var obj = err != null ? {} : (reply || {});
                var modified = false
                var encUrl;

                //self.storage.set(shortname, url);

                if (shortname in obj) {
                    // shortname already exists
                    if (obj[shortname].indexOf(url) === -1) {
                        // url doesn't exists for given shortname
                        debug('url added to an existing shortname!')
                        obj[shortname].push(url)
                        encUrl = crypto.createHash('md5').update(url).digest('hex')
                        _functions[encUrl] = _getRequestFunction(this, url)
                        this.emitter.on(shortname, _functions[encUrl])
                        modified = true
                    }
                } else {
                    // new shortname
                    obj[shortname] = [url]
                    encUrl = crypto.createHash('md5').update(url).digest('hex')
                    _functions[encUrl] = _getRequestFunction(this, url)
                    this.emitter.on(shortname, _functions[encUrl])
                    modified = true
                }

                // actualize DB
                if (modified) {
                    debug('update collection');
                    this.storage.set('dictionary', obj, function () {
                        resolve(true);
                    });
                } else {
                    resolve(false)
                }

            }.bind(this));
            //if (!obj) throw Error('can\'t read webHook DB content')
        } catch (e) {
            reject(e)
        }
    }.bind(this));
}

WebHooks.prototype.remove = function (shortname, url) { // url is optional
    // if url exists remove only the url attached to the selected webHook.
    // else remove the webHook and all the attached URLs.
    if (typeof shortname === 'undefined') throw new TypeError('shortname required!')
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
                var obj = {}; //jsonfile.readFileSync(self.db)

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
                    debug('webHook doesn\'t exists')
                    resolve(false)
                }
            }
        } catch (e) {
            reject(e)
        }
    })
}

function _removeUrlFromShortname(self, shortname, url, callback) {
    try {
        var obj = {};//jsonfile.readFileSync(self.db)

        var deleted = false
        var len = obj[shortname].length
        if (obj[shortname].indexOf(url) !== -1) {
            obj[shortname].splice(obj[shortname].indexOf(url), 1)
        }
        if (obj[shortname].length !== len) deleted = true
        // save it back to the DB
        if (deleted) {
            //jsonfile.writeFileSync(self.db, obj)
            debug('url removed from existing shortname')
            callback(undefined, deleted)
        } else callback(undefined, deleted)
    } catch (e) {
        callback(e, undefined)
    }
}

function _removeShortname(self, shortname, callback) {
    try {
        var obj = {};//jsonfile.readFileSync(self.db)
        delete obj[shortname]
        // save it back to the DB
        //jsonfile.writeFileSync(self.db, obj)
        debug('whole shortname urls removed')
        callback(undefined)
    } catch (e) {
        callback(e)
    }
}

// async method
WebHooks.prototype.getDB = function () {
    // return the whole JSON DB file.
    var self = this
    return new Promise(function (resolve, reject) {
        this.getDictionary(function (obj, err) {
            if (err) {
                return reject(err);
            }
            resolve(obj);
        })
    }.bind(self));
}

// async method
WebHooks.prototype.getWebHook = function (shortname, callback) {
    // return the selected WebHook.
    var self = this;
    self.getDB().then(function (db, err) {
        const obj = db[shortname] || null;
        callback(obj);
    });
}

WebHooks.prototype.get_functions = function () {
    return _functions
}

WebHooks.prototype.getEmitter = function () {
    return this.emitter
}

module.exports = WebHooks
