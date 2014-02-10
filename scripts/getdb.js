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
	if (fileName) {
		var filePath = path.join(dirData, fileName);
		fs.stat(filePath, function(err, stats) {
			var options = {
				hostname: config.intermediateServer.host,
				port: config.intermediateServer.port,
				path: '/'+fileName
			};
			if (!err) options['headers'] = { 'If-Modified-Since': new Date(stats.mtime).toUTCString() };
			var req = http.request(options, function (res) {
				var gunzip = zlib.createGunzip();
				if (res.statusCode == 200) {
					console.log('Loading file: '+fileName);
					var ws = fs.createWriteStream(filePath);
					res.pipe(gunzip);
					gunzip.pipe(ws);
					res.on('end', callback);
				} else {
					console.log('File is not modified: '+fileName);
					res.pipe(gunzip);
				}
				res.on('end', callback);
			});
			req.on('error', function(e) {
				console.log('Request error: ' + e.message);
				callback();
			});
			req.end();
		});
	}
}, function() {
	console.log('Successfully Updated Databases from intermediate server.'.green);
});
