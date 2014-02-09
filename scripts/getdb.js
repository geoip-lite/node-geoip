// Download Geoip dat files from intermediate server
// 
// Run in command line from your project directory:
//   npm run-script geoip-lite getdb
//
// Or run in command line from /node_modules/geoip-lite directory:
//   npm run-script getdb
//

var fs = require('fs');
var http = require('http');
var path = require('path');
var zlib = require('zlib');
var async = require('async');
var colors = require('colors');

var config = require('../config.js');

var dirModule = path.join(__dirname, '..');
var dirData = path.join(dirModule, 'data');

var files = [
	'geoip-city-names.dat',
	'geoip-city.dat',
	'geoip-city6.dat',
	'geoip-country.dat',
	'geoip-country6.dat'
];

async.forEachSeries(files, function(fileName, callback) {
	var req = http.get('http://'+config.intermediateServer.host+':'+config.intermediateServer.port+'/'+fileName);
	req.on('response', function(res){
		var filePath = path.join(dirData, fileName);
		console.log('Loading file: '+fileName);
		var ws = fs.createWriteStream(filePath);
		var gunzip = zlib.createGunzip();
		res.pipe(gunzip);
		gunzip.pipe(ws);
		res.on('end', callback);
	});
}, function() {
	console.log('Successfully Updated Databases from intermediate server.'.green);
});
