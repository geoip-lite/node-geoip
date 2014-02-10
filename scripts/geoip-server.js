// Geoip intermediate server
// 
// Run in command line from your project directory:
//   npm run-script geoip-lite geoip-server
//
// Or run in command line from /node_modules/geoip-lite directory:
//   npm run-script geoip-server
//

var fs = require('fs');
var url = require('url');
var http = require('http');
var path = require('path');
var zlib = require('zlib');
var fork = require('child_process').fork;
var async = require('async');
var colors = require('colors');

var config = require('../config.js');
var utils = require('../lib/utils.js');

var dayMilliseconds = 86400000;
var dirModule = path.join(__dirname, '..');
var dirData = path.join(dirModule, 'data');
var fileCache = [];
var fileList = {};
var scheduleTimer;

// Update from MaxMind and rebuild data files
//
function updateDatabase() {
	console.log('Start scheduled update from MaxMind and rebuild data files'.green.bold);
	var updatedb = fork(path.join(__dirname, 'updatedb.js'), { cwd: dirModule });
	updatedb.on('exit', function (code) {
		console.log('Rebuild memory cache: ');
		prepareMemoryCache();
	});
}

// Schedule update (MaxMind updates first Tuesday of each month, we will update first Wednesday)
//
function scheduleUpdate() {
	var now = new Date();
	if (now.getUTCDate() <=7 && now.getUTCDay() == 3) setTimeout(updateDatabase, utils.random(config.spreadLoad.toMaxMindServer));
	scheduleTimer = setTimeout(scheduleUpdate, utils.nextCheck());
}

// Read directory /data and create gzipped memory cache
//
function prepareMemoryCache() {
	fs.readdir(dirData, function(err, files) {
		if (!err) {
			async.forEach(files,
				function(fileName, callback) {
					var filePath = path.join(dirData, fileName);
					fs.stat(filePath, function(err, stats) {
						if (!err) {
							fs.readFile(filePath, function(err, data) {
								if (!err) {
									var fileSize = data.length;
									zlib.gzip(data, function(err, data) {
										console.log(
											'Load file: '+fileName.yellow+', size: '+utils.bytesToSize(fileSize)+
											', gzipped: '+utils.bytesToSize(data.length)+
											', ratio: '+Math.round(100*data.length/fileSize)+'%'
										);
										fileCache[fileName] = { data:data, time:stats.mtime };
										fileList[fileName] = { size:fileSize, gzipped:data.length, time:stats.mtime.getTime() };
										callback();
									});
								} else {
									console.log('File read error: '+fileName.red);
									callback();
								}
							});
						} else {
							console.log('Error reading file mtime: '+fileName.red);
							callback();
						}
					});
				},
				function(err) {
					console.log('Cache loaded');
					if (!scheduleTimer) scheduleUpdate();
				}
			);
		} else console.log('Error reading rirectory '+dirData.red);
	});
}

// Initial cache loading
//
prepareMemoryCache();

// Start HTTP server with no disk operations, all data serves from gzipped memory cache
//
var server = http.createServer(function(req, res) {
	var fileName = url.parse(req.url).pathname.substring(1);
	if (fileName == "") {
		res.writeHead(200, {
			'Transfer-Encoding': 'chunked',
			'Content-Type': 'application/json'
		});
		res.end(JSON.stringify(fileList));
	} else {
		var cache = fileCache[fileName];
		if (cache) {
			var sinceTime = req.headers['if-modified-since'];
			if (sinceTime && (new Date(cache.time)).getTime() < (new Date(sinceTime)).getTime()) {
				res.statusCode = 304;
				res.end();
			} else {
				res.writeHead(200, {
					'Transfer-Encoding': 'chunked',
					'Content-Type': 'application/octet-stream',
					'Cache-Control': 'public',
					'Content-Length': cache.data.length,
					'Content-encoding': 'gzip'
				});
				res.end(cache.data);
			}
		} else {
			res.statusCode = 404;
			res.end();
		}
	}
});

server.on('error', function(e) {
	if (e.code == 'EADDRINUSE' || e.code == 'EACCESS' || e.code == 'EACCES') {
		console.log('Can\'t bind to host/port'.red);
		process.exit();
	}
});

server.listen(config.intermediateServer.port, config.intermediateServer.host);
console.log('Listen on '+(config.intermediateServer.host+':'+config.intermediateServer.port).yellow.bold);
