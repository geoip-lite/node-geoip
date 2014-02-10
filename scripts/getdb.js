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

function getDirectoryList(callback) {
	var req = http.get('http://'+config.intermediateServer.host+':'+config.intermediateServer.port+'/');
	req.on('response', function(res) {
		var body = '';
		res.on('data', function(chunk) {
			body += chunk;
		});
		res.on('end', function() {
			var data = null;
			try { data = JSON.parse(body); } catch(err) {}
			callback(null, data);
		});
	}).on('error', function(e) {
		console.log('Error retrieving directory list: '+e.message);
		callback(null, null);
	}).end();
}

function exitWithError() {
	console.log('Geoip database update failed.'.red);
	process.exit(1);
}

getDirectoryList(function(err, listBefore) {
	if (listBefore) {
		var files = Object.keys(listBefore);
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
						console.log('Request error: '+e.message);
						callback();
					});
					req.end();
				});
			}
		}, function() {
			getDirectoryList(function(err, listAfter) {
				if (listAfter) {
					var isEqual = true;
					for (var fileName in listAfter) {
						var fileAfter = listAfter[fileName];
						var fileBefore = listBefore[fileName];
						isEqual = isEqual && fileAfter && fileBefore && (fileAfter.time == fileBefore.time);
					}
					if (isEqual) console.log('Successfully Updated Databases from intermediate server.'.green);
					else exitWithError();
				} else exitWithError();
			});
		});
	} else exitWithError();
});
