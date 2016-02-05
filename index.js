var events = require('events');
var eventEmitter = new events.EventEmitter();


// WebHooks Class
function WebHooks(options){
	if (typeof str !== 'object') throw new TypeError('Expected an Object');
	if (typeof options.db !== 'string') throw new TypeError('db Must be a String path');

	this.db = options.db;

	fs.access(this.db, fs.R_OK | fs.W_OK, function (err) {
		if (typeof err !== 'undefined' && err.hasOwnProperty('code')){
			if (err.code === 'ENOENT') // file not found, init DB:
				_initDB(this.db).catch(function(err){ throw new Error(err); });
		}else{
			// DB already exists, set listeners.
			_setListeners(this.db);
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

function _setListeners(file){
	jsonfile.readFile(file, function(err, obj) {
		
	});
}


// 'prototype' has improved performances, let's declare methods
WebHooks.prototype.trigger = function() {
	// se c'è, altrimenti pazienza.
	return new Promise(function(resolve, reject){
		
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
	// TODO if url exists remove only the url attached to the selected webHook.
	// else remove the webHook and all the attached URLs.
	return new Promise(function(resolve, reject){

		// Basically removeListener will look up the given function by reference, if it found that function it will remove it from the event hander.

	});
};

WebHooks.prototype.getDB = function() {
	// TODO return the whole JSON DB file.
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

/*
DB Structure Example:

{
	"shortname1": [url1, url2, ...],
	"shortname2": [url3, url4, ...],
	 ...
	 ...
	"shortnameX": [urlZ, ...]
}

*/
