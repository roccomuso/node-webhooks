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

var crypto = require('crypto');
var request = require('request');
var events = require('events');
var eventEmitter = new events.EventEmitter();

// will contain all the functions. We need to store them to be able to remove the listener callbacks
var _functions = {}; 

// WebHooks Class
function WebHooks(options){
	if (typeof str !== 'object') throw new TypeError('Expected an Object');
	if (typeof options.db !== 'string') throw new TypeError('db Must be a String path');


	this.DEBUG = (typeof options.DEBUG === 'boolean') ? options.DEBUG : false;
	this.db = options.db;

	fs.access(this.db, fs.R_OK | fs.W_OK, function (err) {
		if (typeof err !== 'undefined' && err.hasOwnProperty('code')){
			if (err.code === 'ENOENT') // file not found, init DB:
				_initDB(this.db).catch(function(err){ throw new Error(err); });
		}else{
			// DB already exists, set listeners for every URL.
			_setListeners(this).catch(function(err){ throw new Error(err); });

		}
	});
	

}

function _initDB(file){
	// init DB.
	return new Promise(function(resolve, reject){
	  	var db = {}; // init empty db
		jsonfile.writeFile(file, db, {spaces: 2}, function(err) {
		  if (err) reject(err);
		  else resolve();
		});
	});
}

function _setListeners(self){
	// set Listeners
	return new Promise(function(resolve, reject){
		jsonfile.readFile(self.db, function(err, obj) {
			if (err) return reject(err);
			for (var key in obj) {
			    // skip loop if the property is from prototype
			    if (!obj.hasOwnProperty(key)) continue;

			    var urls = obj[key];
			    urls.forEach(function(url){
			    	var enc_url = crypto.createHash('md5').update(url).digest("hex");
			    	_functions[enc_url] = _getRequestFunction(self);
			    	eventEmitter.on(key, _functions[enc_url]);
			    });
			}
			resolve();
		});
	});
}

function _getRequestFunction(self){
	// return the function then called by the event listener.
	var func = functions(shortname, json_data){ // 2 arguments required when eventEmitter.emit()

		jsonfile.readFile(self.db, function(err, obj){
			if (err && self.DEBUG) return console.error(err);
			for (var key in obj){
			    // skip loop if the property is from prototype
			    if (!obj.hasOwnProperty(key)) continue;

			    var urls = obj[key];
			    urls.forEach(function(url){
					// POST request to every URL if any.
					if (url)
						request({
						    method: 'POST',
						    uri: url,
						    strictSSL: false,
						    headers: {'cache-control': 'no-cache', 'Content-Type': 'application/json'},
						    body: JSON.stringify(json_data) 
						  },
						  function (error, response, body) {
							    if ((error || response.statusCode !== 200 ) && self.DEBUG) return console.error('HTTP failed: '+ error);
								if (self.DEBUG) console.log('Request sent - Server responded with:', body);
						  }
						);

			    });
			}
		});
	};

	return func;
}

// 'prototype' has improved performances, let's declare the methods

WebHooks.prototype.trigger = function(shortname, json_data) {
	// se c'è, altrimenti pazienza.
	return new Promise(function(resolve, reject){
		eventEmitter.emit(shortname, shortname, json_data);
		resolve();
	});
};

WebHooks.prototype.add = function(shortname, url) { // url is required
	// TODO add a new webHook.
	// se già c'è lo shortname si aggiunge la URL all'array.
	return new Promise(function(resolve, reject){
		// no blank spaces.

	});
};

WebHooks.prototype.remove = function(shortname, url) { // url is optional
	// if url exists remove only the url attached to the selected webHook.
	// else remove the webHook and all the attached URLs.
	var self = this;
	return new Promise(function(resolve, reject){
		// Basically removeListener will look up the given function by reference, if it found that function it will remove it from the event hander.
		var url_key = crypto.createHash('md5').update(url).digest("hex");
		if (typeof url !== 'undefined'){
			// remove only the specified url
			eventEmitter.removeListener(shortname, _functions[url_key]);
			delete _functions[url_key];
			// save in db
			_removeUrlFromShortname(self, shortname, url, function(err){
				if (err) return reject(err);
				resolve(true);
			});

		}else{
			// remove every event listener attached to the webHook shortname.
			eventEmitter.removeAllListeners(shortname);

			// delete all the callbacks in _functions for the specified shortname. Let's loop over the url taken from the DB.
			jsonfile.readFile(self.db, function(err, obj){
				if (err && self.DEBUG) return reject(err);
				var urls = obj[shortname];
				urls.forEach(function(url){
					var url_key = crypto.createHash('md5').update(url).digest("hex");
					delete _functions[url_key];
				});
			});

			// attualizzare nel DB
			_removeShortname(self, shortname, function(err){
				if (err) return reject(err);
				resolve(true);
			});

		}

	});
};

function _removeUrlFromShortname(self, shortname, url, callback){
		var url_key = crypto.createHash('md5').update(url).digest("hex");
		jsonfile.readFile(self.db, function(err, obj){
			if (err && self.DEBUG) return console.error(err);
			
			obj[shortname] = obj[shortname].splice(obj[shortname].indexOf(url_key), 1);
			// save it back to the DB
			jsonfile.writeFile(self.db, obj, function (err) {
			  if (err && self.DEBUG) callback(err);
			  else callback(undefined);
			});
			
		});
}

function _removeShortname(self, shortname, callback){
		jsonfile.readFile(self.db, function(err, obj){
			if (err && self.DEBUG) return console.error(err);
			
			delete obj[shortname];
			// save it back to the DB
			jsonfile.writeFile(self.db, obj, function (err) {
			  if (err && self.DEBUG) callback(err);
			  else callback(undefined);
			});
			
		});
}

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

WebHooks.prototype.getWebHook = function(shortname) {
	// TODO return the selected WebHook.
	return new Promise(function(resolve, reject){

	});
};

WebHooks.prototype.getDescription = function(shortname, url) { // url is required
	// TODO return description for given shortname and url
	return new Promise(function(resolve, reject){

	});
};

module.exports = WebHooks;

