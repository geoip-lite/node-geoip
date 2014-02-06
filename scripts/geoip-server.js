var fs    = require('fs'),
	url   = require('url'),
	http  = require('http'),
	path  = require('path'),
	zlib  = require('zlib'),
	exec  = require('child_process').exec,
	async = require('async');

var config = require('./config.js');

var dayMilliseconds = 86400000,
	dirModule = path.join(__dirname, '..'),
	dirData = path.join(dirModule, 'data'),
	fileCache;

// Schedule update from MaxMind and rebuild data files
// MaxMind updates first Tuesday of each month, we will update first Wednesday
//
(function schaduleUpdate() {
	var now = new Date();
	if (now.getUTCDate() <=7 && now.getUTCDay() == 3) {
		exec("npm run-script updatedb", { cwd: dirModule }, function(error, stdout, stderr) {
			console.log(stdout);
		});
	}
	var nextCheck = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0) - now + dayMilliseconds;
	setTimeout(schaduleUpdate, nextCheck);
}) ();

// Read directory /data and create gzipped memory cache
//
(function prepareMemoryCache() {
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
								console.log('Load file: '+fileName+', size: '+fileSize+', gzipped: '+data.length+', ratio: '+Math.round(100*data.length/fileSize)+' %');
								fileCache[fileName] = data;
								callback();
							});
						} else {
							console.log('File read error: '+fileName);
							callback();
						}
					});
				},
				function(err) {
					console.log('Cache loaded');
				}
			);
		} else console.log('Error reading rirectory '+dirData);
	});
}) ();

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
}).listen(config.port, config.host);
