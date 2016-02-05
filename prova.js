var jsonfile = require('jsonfile');
var util = require('util');
var fs = require('fs');

var file = './data.json';

// jsonfile.readFile(file, function(err, obj) {
// 	if (err){
// 	  	if (err.code === 'ENOENT') { // file not found
// 			  if (typeof obj === 'undefined'){
// 			  	var db = {}; // init empty db
// 				jsonfile.writeFile(file, db, {spaces: 2}, function(err) {
// 				  if (err) console.error(err);
// 				});
// 			  }
// 		} else {
// 		  	throw new Error(err);
// 		}
// 	}else{
// 		// file exists
// 		resolve(obj);
// 	}
// });

fs.access(file, fs.R_OK | fs.W_OK, function (err) {
	console.log(err);
  console.log(err ? 'no access!' : 'can read/write');
});