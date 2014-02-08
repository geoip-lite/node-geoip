// Geoip intermediate server
// 
// Run in command line from your project directory:
//   npm run-script geoip-lite geoip-server
//
// Or run in command line from /node_modules/geoip-lite directory:
//   npm run-script geoip-server
//

var fs    = require('fs'),
	url   = require('url'),
	http  = require('http'),
	path  = require('path'),
	zlib  = require('zlib'),
	fork = require('child_process').fork,
	async = require('async'),
	colors = require('colors');

var config = require('./config.js'),
	cu = require('./common-utils.js');

var dayMilliseconds = 86400000,
	dirModule = path.join(__dirname, '..'),
	dirData = path.join(dirModule, 'data'),
	fileCache, scheduleTimer;

// Schedule update from MaxMind and rebuild data files
// MaxMind updates first Tuesday of each month, we will update first Wednesday
//
function scheduleUpdate() {
	var now = new Date();
	if (now.getUTCDate() <=7 && now.getUTCDay() == 3) {
		console.log('Start scheduled update from MaxMind and rebuild data files'.green.bold);
		var updatedb = fork(path.join(__dirname, 'updatedb.js'), { cwd: dirModule });
		updatedb.on('exit', function (code) {
			console.log('Rebuild memory cache: ');
			prepareMemoryCache();
		});
	}
	var nextCheck = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0) - now + dayMilliseconds;
	
	scheduleTimer = setTimeout(scheduleUpdate, nextCheck);
};

// Read directory /data and create gzipped memory cache
//
function prepareMemoryCache() {
	fileCache = [];
	fs.readdir(dirData, function(err, files) {
		if (!err) {
			async.forEach(files,
				function(fileName, callback) {
					var filePath = path.join(dirData, fileName);
					fs.readFile(filePath, function(err, data) {
						if (!err) {
							var fileSize = data.length;
							zlib.gzip(data, function(err, data) {
								console.log(
									'Load file: '+fileName.yellow+', size: '+cu.bytesToSize(fileSize)+
									', gzipped: '+cu.bytesToSize(data.length)+
									', ratio: '+Math.round(100*data.length/fileSize)+'%'
								);
								fileCache[fileName] = data;
								callback();
							});
						} else {
							console.log('File read error: '+fileName.red);
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
};

// Initial cache loading
//
prepareMemoryCache();

// Start HTTP server with no disk operations, all data serves from gzipped memory cache
//
var server = http.createServer(function(req, res) {
	var fileName = url.parse(req.url).pathname.substring(1),
		cacheData = fileCache[fileName];
	if (cacheData) {
		res.writeHead(200, {
			'Transfer-Encoding': 'chunked',
			'Content-Type': 'application/octet-stream',
			'Cache-Control': 'public',
			'Content-Length': cacheData.length,
			'Content-encoding': 'gzip'
		});
		res.end(cacheData);
	} else {
		res.statusCode = 404;
		res.end();
	}
});

server.on('error', function(e) {
	if (e.code == 'EADDRINUSE' || e.code == 'EACCESS' || e.code == 'EACCES') {
		console.log('Can\'t bind to host/port'.red);
		process.exit();
	}
});

server.listen(config.port, config.host);
console.log('Listen on '+(config.host+':'+config.port).yellow.bold);
