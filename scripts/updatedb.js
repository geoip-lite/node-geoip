// fetches and converts maxmind lite databases

'use strict';

var cp = require('child_process');
var fs = require('fs');
var http = require('http');
var path = require('path');
var url = require('url');
var zlib = require('zlib');

fs.existsSync = fs.existsSync || path.existsSync;

var async = require('async');
var colors = require('colors');
var glob = require('glob');
var iconv = require('iconv-lite');
var lazy = require('lazy');
var rimraf = require('rimraf').sync;
var unzip = require('unzip');
var utils = require('../lib/utils');

var dataPath = path.join(__dirname, '..', 'data');
var tmpPath = path.join(__dirname, '..', 'tmp');

var databases = [{
	type: 'country',
	url: 'http://geolite.maxmind.com/download/geoip/database/GeoIPCountryCSV.zip',
	src: 'GeoIPCountryWhois.csv',
	dest: 'geoip-country.dat'
},{
	type: 'country',
	url: 'http://geolite.maxmind.com/download/geoip/database/GeoIPv6.csv.gz',
	src: 'GeoIPv6.csv',
	dest: 'geoip-country6.dat'
},{
	type: 'city-extended',
	url: 'http://geolite.maxmind.com/download/geoip/database/GeoLiteCity_CSV/GeoLiteCity-latest.zip',
	src: [
		'GeoLiteCity/GeoLiteCity-Blocks.csv',
		'GeoLiteCity/GeoLiteCity-Location.csv'
	],
	dest: [
		'geoip-city.dat',
		'geoip-city-names.dat'
	]
},{
	type: 'city',
	url: 'http://geolite.maxmind.com/download/geoip/database/GeoLiteCityv6-beta/GeoLiteCityv6.csv.gz',
	src: 'GeoLiteCityv6.csv',
	dest: 'geoip-city6.dat'
}];

function mkdir(name) {
	var dir = path.dirname(name);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}
}

// Ref: http://stackoverflow.com/questions/8493195/how-can-i-parse-a-csv-string-with-javascript
// Return array of string values, or NULL if CSV string not well formed.
function CSVtoArray(text) {
    var re_valid = /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*(?:,\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*)*$/;
    var re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
    // Return NULL if input string is not well formed CSV string.
    if (!re_valid.test(text)) return null;
    var a = [];                     // Initialize array to receive values.
    text.replace(re_value, // "Walk" the string using replace with callback.
        function(m0, m1, m2, m3) {
            // Remove backslash from \' in single quoted values.
            if      (m1 !== undefined) a.push(m1.replace(/\\'/g, "'"));
            // Remove backslash from \" in double quoted values.
            else if (m2 !== undefined) a.push(m2.replace(/\\"/g, '"'));
            else if (m3 !== undefined) a.push(m3);
            return ''; // Return empty string.
        });
    // Handle special case of empty last value.
    if (/,\s*$/.test(text)) a.push('');
    return a;
}

function fetch(downloadUrl, cb) {
	function getOptions() {
		if (process.env.http_proxy) {
			var options = url.parse(process.env.http_proxy);

			options.path = downloadUrl;
			options.headers = {
				Host: url.parse(downloadUrl).host
			};

			return options;
		} else {
			return url.parse(downloadUrl);
		}
	}

	function onResponse(response) {
		var status = response.statusCode;

		if (status !== 200) {
			console.log('ERROR'.red + ': HTTP Request Failed [%d %s]', status, http.STATUS_CODES[status]);
			client.abort();
			process.exit();
		}

		var tmpFilePipe;
		var tmpFileStream = fs.createWriteStream(tmpFile);

		if (gzip) {
			tmpFilePipe = response.pipe(zlib.createGunzip()).pipe(tmpFileStream);
		} else {
			tmpFilePipe = response.pipe(tmpFileStream);
		}

		tmpFilePipe.on('close', function() {
			console.log(' DONE'.green);
			cb(tmpFile, fileName);
		});
	}

	var fileName = downloadUrl.split('/').pop();
	var gzip = (fileName.indexOf('.gz') !== -1);

	if (gzip) {
		fileName = fileName.replace('.gz', '');
	}

	var tmpFile = path.join(tmpPath, fileName);

	mkdir(tmpFile);

	var client = http.get(getOptions(), onResponse);

	process.stdout.write('Retrieving ' + fileName + ' ...');
}

function extract(tmpFile, tmpFileName, cb) {
	if (tmpFileName.indexOf('.zip') === -1) {
		cb();
	} else {
		process.stdout.write('Extracting ' + tmpFileName + ' ...');

		var unzipStream = unzip.Extract({
			path: path.dirname(tmpFile)
		});

		var pipeSteam = fs.createReadStream(tmpFile).pipe(unzipStream);

		pipeSteam.on('end', function() {
			console.log(' DONE'.green);

			if (tmpFileName.indexOf('GeoLiteCity') !== -1) {
				var oldPath = path.join(tmpPath, path.basename(tmpFileName, '.zip'));
				if(!fs.existsSync(oldPath)) {
					if(/-latest$/.test(oldPath)) {
						var prefix = oldPath.replace(/-latest$/, '');
						oldPath = glob.sync(prefix + '_*')[0];
					}
				}

				var newPath = path.join(tmpPath, 'GeoLiteCity');
				fs.renameSync(oldPath, newPath);
			}

			cb();
		});
	}
}

function processCountryData(src, dest, cb) {
	var lines=0;
	function processLine(line) {
		var fields = CSVtoArray(line);

		if (fields.length < 6) {
			console.log("weird line: %s::", line);
			return;
		}
		lines++;

		var sip;
		var eip;
		var cc = fields[4].replace(/"/g, '');
		var b;
		var bsz;
		var i;

		if (fields[0].match(/:/)) {
			// IPv6
			bsz = 34;
			sip = utils.aton6(fields[0]);
			eip = utils.aton6(fields[1]);

			b = new Buffer(bsz);
			for (i = 0; i < sip.length; i++) {
				b.writeUInt32BE(sip[i], i * 4);
			}

			for (i = 0; i < eip.length; i++) {
				b.writeUInt32BE(eip[i], 16 + (i * 4));
			}
		} else {
			// IPv4
			bsz = 10;

			sip = parseInt(fields[2].replace(/"/g, ''), 10);
			eip = parseInt(fields[3].replace(/"/g, ''), 10);

			b = new Buffer(bsz);
			b.fill(0);
			b.writeUInt32BE(sip, 0);
			b.writeUInt32BE(eip, 4);
		}

		b.write(cc, bsz - 2);

		fs.writeSync(datFile, b, 0, bsz, null);
		if(Date.now() - tstart > 5000) {
			tstart = Date.now();
			process.stdout.write('\nStill working (' + lines + ') ...');
		}
	}

	var dataFile = path.join(dataPath, dest);
	var tmpDataFile = path.join(tmpPath, src);

	rimraf(dataFile);
	mkdir(dataFile);

	process.stdout.write('Processing Data (may take a moment) ...');
	var tstart = Date.now();
	var datFile = fs.openSync(dataFile, "w");

	lazy(fs.createReadStream(tmpDataFile))
		.lines
		.map(function(byteArray) {
			return iconv.decode(byteArray, 'latin1');
		})
		.skip(1)
		.map(processLine)
		.on('pipe', function() {
			console.log(' DONE'.green);
			cb();
		});
}

function processCityData(src, dest, cb) {
	var lines = 0;
	function processLine(line) {
		if (line.match(/^Copyright/) || !line.match(/\d/)) {
			return;
		}

		var fields = CSVtoArray(line);
		var sip;
		var eip;
		var locId;
		var b;
		var bsz;

		var i;

		lines++;

		if (fields[0].match(/:/)) {
			// IPv6
			var offset = 0;

			var cc = fields[4];
			var city = fields[6];
			var lat = Math.round(parseFloat(fields[7]) * 10000);
			var lon = Math.round(parseFloat(fields[8]) * 10000);
			var rg = fields[5];

			bsz = 58;
			sip = utils.aton6(fields[0]);
			eip = utils.aton6(fields[1]);

			b = new Buffer(bsz);
			b.fill(0);

			for (i = 0; i < sip.length; i++) {
				b.writeUInt32BE(sip[i], offset);
				offset += 4;
			}

			for (i = 0; i < eip.length; i++) {
				b.writeUInt32BE(eip[i], offset);
				offset += 4;
			}

			b.write(cc, offset);
			b.write(rg, offset + 2);
			b.writeInt32BE(lat, offset + 4);
			b.writeInt32BE(lon, offset + 8);
			b.write(city, offset + 12);
		} else {
			// IPv4
			bsz = 12;

			sip = parseInt(fields[0], 10);
			eip = parseInt(fields[1], 10);
			locId = parseInt(fields[2], 10);

			b = new Buffer(bsz);
			b.fill(0);
			b.writeUInt32BE(sip>>>0, 0);
			b.writeUInt32BE(eip>>>0, 4);
			b.writeUInt32BE(locId>>>0, 8);
		}

		fs.writeSync(datFile, b, 0, b.length, null);
		if(Date.now() - tstart > 5000) {
			tstart = Date.now();
			process.stdout.write('\nStill working (' + lines + ') ...');
		}
	}

	var dataFile = path.join(dataPath, dest);
	var tmpDataFile = path.join(tmpPath, src);

	rimraf(dataFile);

	process.stdout.write('Processing Data (may take a moment) ...');
	var tstart = Date.now();
	var datFile = fs.openSync(dataFile, "w");

	lazy(fs.createReadStream(tmpDataFile))
		.lines
		.map(function(byteArray) {
			return iconv.decode(byteArray, 'latin1');
		})
		.skip(1)
		.map(processLine)
		.on('pipe', cb);
}

function processCityDataNames(src, dest, cb) {
	function processLine(line, i, a) {
		if (line.match(/^Copyright/) || !line.match(/\d/)) {
			return;
		}

		var fields = CSVtoArray(line);
		var cc = fields[1];
		var rg = fields[2];
		var city = fields[3];
		var lat = Math.round(parseFloat(fields[5]) * 10000);
		var lon = Math.round(parseFloat(fields[6]) * 10000);
		var b;
		var sz = 32;

		b = new Buffer(sz);
		b.fill(0);
		b.write(cc, 0);
		b.write(rg, 2);
		b.writeInt32BE(lat, 4);
		b.writeInt32BE(lon, 8);
		b.write(city, 12);

		fs.writeSync(datFile, b, 0, b.length, null);
	}

	var dataFile = path.join(dataPath, dest);
	var tmpDataFile = path.join(tmpPath, src);

	rimraf(dataFile);

	var datFile = fs.openSync(dataFile, "w");

	lazy(fs.createReadStream(tmpDataFile))
		.lines
		.map(function(byteArray) {
			return iconv.decode(byteArray, 'latin1');
		})
		.skip(1)
		.map(processLine)
		.on('pipe', cb);
}

function processData(type, src, dest, cb) {
	if (type === 'country') {
		processCountryData(src, dest, cb);
	} else if (type === 'city-extended') {
		processCityData(src[0], dest[0], function() {
			processCityDataNames(src[1], dest[1], function() {
				console.log(' DONE'.green);
				cb();
			});
		});
	} else {
		processCityData(src, dest, function() {
			console.log(' DONE'.green);
			cb();
		});
	}
}

rimraf(tmpPath);
mkdir(tmpPath);

async.forEachSeries(databases, function(database, nextDatabase) {
	fetch(database.url, function(tmpFile, tmpFileName) {
		extract(tmpFile, tmpFileName, function() {
			processData(database.type, database.src, database.dest, function() {
				console.log();
				nextDatabase();
			});
		});
	});
}, function(err) {
	console.log();

	if (err) {
		console.log('Failed to Update Databases from MaxMind.'.red);
		process.exit();
	} else {
		console.log('Successfully Updated Databases from MaxMind.'.green);
		if (process.argv[2]=='debug') console.log('Notice: temporary files are not deleted for debug purposes.'.bold.yellow);
		else rimraf(tmpPath);
	}
});
