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

var debug = require('debug')('node-webhooks');
var Promise = require('bluebird'); // for backward compatibility
var _ = require('lodash');
var jsonfile = require('jsonfile');
var fs = require('fs');
var crypto = require('crypto');
var request = require('request');
var events = require('eventemitter2');

// will contain all the functions. We need to store them to be able to remove the listener callbacks
var _functions = {};

// WebHooks Class
function WebHooks(options){
	if (typeof options !== 'object') throw new TypeError('Expected an Object');
	if (typeof options.db !== 'string') throw new TypeError('db Must be a String path');

	this.db = options.db;

	this.emitter = new events.EventEmitter2({ wildcard: true });

	var self = this;
	// sync loading:
	try{
		fs.accessSync(this.db, fs.R_OK | fs.W_OK);
		//DB already exists, set listeners for every URL.
		debug('webHook DB loaded, setting listeners...');
		_setListeners(self);
	} catch(e){ // DB file not found, initialize it
		if (e.hasOwnProperty('code')){
			if (e.code === 'ENOENT'){ // file not found, init DB:
				debug('webHook DB init');
				_initDB(self.db);
			} else console.error(e);
		} else console.error(e);
	}

}

function _initDB(file){
	// init DB.
	 var db = {}; // init empty db
	jsonfile.writeFileSync(file, db, {spaces: 2});
}

function _setListeners(self){
	// set Listeners - sync method

	try{
		var obj = jsonfile.readFileSync(self.db);
		if (!obj) throw Error('can\'t read webHook DB content');

		for (var key in obj) {
		    // skip loop if the property is from prototype
		    if (!obj.hasOwnProperty(key)) continue;

		    var urls = obj[key];
		    urls.forEach(function(url){
		    	var enc_url = crypto.createHash('md5').update(url).digest('hex');
		    	_functions[enc_url] = _getRequestFunction(self, url);
		    	self.emitter.on(key, _functions[enc_url]);
		    });
		}
	}catch(e){
		throw Error(e);
	}

	// console.log(_functions[0] == _functions[1]);
	// console.log(_functions[1] == _functions[2]);
	// console.log(_functions[0] == _functions[2]);

}

function _getRequestFunction(self, url){
	// return the function then called by the event listener.
	var func = function(shortname, json_data, headers_data){ // argument required when eventEmitter.emit()
			var obj = {'Content-Type': 'application/json'};
			var headers = headers_data ? _.merge(obj, headers_data) : obj;

	    	debug('POST request to:', url);
			// POST request to the instantiated URL with custom headers if provided
			request({
			    method: 'POST',
			    uri: url,
			    strictSSL: false,
			    headers: headers,
			    body: JSON.stringify(json_data)
			  },
			  function (error, response, body) {
				  	var statusCode = response ? response.statusCode : null;
				  	body = body ? body : null;
						debug('Request sent - Server responded with:', statusCode, body);

				    if ((error || statusCode !== 200 )) {
						self.emitter.emit(shortname + '.failure', shortname, statusCode, body);
						return debug('HTTP failed: '+ error);
					}

				  	self.emitter.emit(shortname + '.success', shortname, statusCode, body);
			  }
			);

	};

	return func;
}

// 'prototype' has improved performances, let's declare the methods

WebHooks.prototype.trigger = function(shortname, json_data, headers_data) {
	// trigger a webHook
	this.emitter.emit(shortname, shortname, json_data, headers_data);
};

WebHooks.prototype.add = function(shortname, url) { // url is required
	// add a new webHook.
	if (typeof shortname !== 'string') throw new TypeError('shortname required!');
	if (typeof url !== 'string') throw new TypeError('Url must be a string');

	var self = this;
	return new Promise(function(resolve, reject){

		try{

				var obj = jsonfile.readFileSync(self.db);
				if (!obj) throw Error('can\'t read webHook DB content');

				var modified = false;
				if (obj[shortname]){
					// shortname already exists
					if (obj[shortname].indexOf(url) === -1){
						// url doesn't exists for given shortname
						debug('url added to an existing shortname!');
						obj[shortname].push(url);
						var enc_url = crypto.createHash('md5').update(url).digest('hex');
				    	_functions[enc_url] = _getRequestFunction(self, url);
				    	self.emitter.on(shortname, _functions[enc_url]);
				    	modified = true;
					}
				}else{
					// new shortname
					debug('new shortname!');
					obj[shortname] = [url];
					var enc_url = crypto.createHash('md5').update(url).digest('hex');
				    _functions[enc_url] = _getRequestFunction(self, url);
				    self.emitter.on(shortname, _functions[enc_url]);
				    modified = true;
				}

				// actualize DB
				if (modified){
					jsonfile.writeFileSync(self.db, obj);
					  resolve(true);
				} else resolve(false);



	}catch(e){
		reject(e);
	}

	});
};

WebHooks.prototype.remove = function(shortname, url) { // url is optional
	// if url exists remove only the url attached to the selected webHook.
	// else remove the webHook and all the attached URLs.
	if (typeof shortname === 'undefined') throw new TypeError('shortname required!');
	var self = this;
	return new Promise(function(resolve, reject){
		// Basically removeListener will look up the given function by reference, if it found that function it will remove it from the event hander.
		try{
			if (typeof url !== 'undefined'){

				// save in db
				_removeUrlFromShortname(self, shortname, url, function(err, done){
					if (err) return reject(err);
					if (done){
						// remove only the specified url
						var url_key = crypto.createHash('md5').update(url).digest('hex');
						self.emitter.removeListener(shortname, _functions[url_key]);
						delete _functions[url_key];
						resolve(true);
					}
					else resolve(false);
				});

			}else{
				// remove every event listener attached to the webHook shortname.
				self.emitter.removeAllListeners(shortname);

				// delete all the callbacks in _functions for the specified shortname. Let's loop over the url taken from the DB.
				var obj = jsonfile.readFileSync(self.db);

				if (obj.hasOwnProperty(shortname)){
					var urls = obj[shortname];
					urls.forEach(function(url){
						var url_key = crypto.createHash('md5').update(url).digest('hex');
						delete _functions[url_key];
					});

					// save it back to the DB
					_removeShortname(self, shortname, function(err){
						if (err) return reject(err);
						resolve(true);
					});

				} else {
					debug('webHook doesn\'t exists');
					resolve(false);
				}


			}

		}catch(e){
			reject(e);
		}

	});
};

function _removeUrlFromShortname(self, shortname, url, callback){

	try{
		var obj = jsonfile.readFileSync(self.db);

			var deleted = false;
			var len = obj[shortname].length;
			if (obj[shortname].indexOf(url) !== -1)
				obj[shortname].splice(obj[shortname].indexOf(url), 1);
			if (obj[shortname].length !== len) deleted = true;
			// save it back to the DB
			if (deleted){
				jsonfile.writeFileSync(self.db, obj);
				debug('url removed from existing shortname');
				callback(undefined, deleted);
			} else callback(undefined, deleted);

	}catch(e){
		callback(e, undefined);
	}

}

function _removeShortname(self, shortname, callback){
	try{

		var obj = jsonfile.readFileSync(self.db);
		delete obj[shortname];
		// save it back to the DB
		jsonfile.writeFileSync(self.db, obj);
		debug('whole shortname urls removed');
		callback(undefined);

	}catch(e){
		callback(e);
	}

}

// async method
WebHooks.prototype.getDB = function() {
	// return the whole JSON DB file.
	var self = this;
	return new Promise(function(resolve, reject){
		jsonfile.readFile(self.db, function(err, obj) {
			if (err){
			  	if (err.code === 'ENOENT') // file not found
					reject('file not found');
				 else
				  	reject(err);
			}else{
				// file exists
				resolve(obj);
			}
		});
	});
};

// async method
WebHooks.prototype.getWebHook = function(shortname) {
	// return the selected WebHook.
	var self = this;
	return new Promise(function(resolve, reject){
		jsonfile.readFile(self.db, function(err, obj) {
			if (err){
			  	if (err.code === 'ENOENT') // file not found
					reject('file not found');
				 else
				  	reject(err);
			}else{
				// file exists
				if (obj[shortname])
					resolve(obj[shortname]);
				else
					resolve({});
			}
		});
	});
};

WebHooks.prototype.get_functions = function(){
	return _functions;
};

WebHooks.prototype.getEmitter = function(){
	return this.emitter;
};

module.exports = WebHooks;
