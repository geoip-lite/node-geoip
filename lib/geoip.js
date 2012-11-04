var fs = require('fs');
var net = require('net');
var path = require('path');

fs.existsSync = fs.existsSync || path.existsSync;

var utils = require('./utils');

var geodatadir;

if (typeof global.geodatadir === 'undefined'){
	geodatadir = path.join(__dirname, '/../data/');
} else {
	geodatadir = global.geodatadir;
}

var dataFiles = {
	city: path.join(geodatadir, 'geoip-city.dat'),
	city6: path.join(geodatadir, 'geoip-city6.dat'),
	cityNames: path.join(geodatadir, 'geoip-city-names.dat'),
	country: path.join(geodatadir, 'geoip-country.dat'),
	country6: path.join(geodatadir, 'geoip-country6.dat')
};

var cache = {
	firstIP: null,
	firstIP6: null,
	lastIP: null,
	lastIP6: null,
	lastLine: 0,
	lastLine6: 0,
	locationBuffer: null,
	locationRecordSize: 32,
	mainBuffer: null,
	mainBuffer6: null,
	recordSize: 12,
	recordSize6: 58,
	privateRange: [
		[utils.aton4('10.0.0.0'), utils.aton4('10.255.255.255')],
		[utils.aton4('172.16.0.0'), utils.aton4('172.31.255.255')],
		[utils.aton4('192.168.0.0'), utils.aton4('192.168.255.255')]
	]
};

function lookup4(ip) {
	var fline = 0;
	var floor = cache.lastIP;
	var cline = cache.lastLine;
	var ceil = cache.firstIP;
	var line;
	var locId;

	var buffer = cache.mainBuffer;
	var locBuffer = cache.locationBuffer;
	var privateRange = cache.privateRange;
	var recordSize = cache.recordSize;
	var locRecordSize = cache.locationRecordSize;

	var i;

	var geodata = {
		range: '',
		country: '',
		region: '',
		city: '',
		ll: [0, 0]
	};

	// outside IPv4 range
	if (ip > cache.lastIP || ip < cache.firstIP) {
		return null;
	}

	// private IP
	for (i = 0; i < privateRange.length; i++) {
		if (ip >= privateRange[i][0] && ip <= privateRange[i][1]) {
			return null;
		}
	}

	do {
		line = Math.round((cline - fline) / 2) + fline;
		floor = buffer.readUInt32BE(line * recordSize);
		ceil  = buffer.readUInt32BE((line * recordSize) + 4);

		if (floor <= ip && ceil >= ip) {
			geodata.range = [floor, ceil];

			if (recordSize === 10) {
				geodata.country = buffer.toString('utf8', (line * recordSize) + 8, (line * recordSize) + 10);
			} else {
				locId = buffer.readUInt32BE((line * recordSize) + 8) - 1;

				geodata.country = locBuffer.toString('utf8', (locId * locRecordSize) + 0, (locId * locRecordSize) + 2).replace(/\u0000.*/, '');
				geodata.region = locBuffer.toString('utf8', (locId * locRecordSize) + 2, (locId * locRecordSize) + 4).replace(/\u0000.*/, '');
				geodata.ll = [locBuffer.readInt32BE((locId * locRecordSize) + 4) / 10000, locBuffer.readInt32BE((locId * locRecordSize) + 8) / 10000];
				geodata.city = locBuffer.toString('utf8', (locId * locRecordSize) + 12, (locId * locRecordSize) + locRecordSize).replace(/\u0000.*/, '');
			}

			return geodata;
		} else if (fline === cline) {
			return null;
		} else if (fline === (cline - 1)) {
			if (line === fline) {
				fline = cline;
			} else {
				cline = fline;
			}
		} else if (floor > ip) {
			cline = line;
		} else if (ceil < ip) {
			fline = line;
		}
	} while(1);
}

function lookup6(ip) {
	var buffer = cache.mainBuffer6;
	var recordSize = cache.recordSize6;

	var geodata = {
		range: '',
		country: '',
		region: '',
		city: '',
		ll: [0, 0]
	};

	// XXX We only use the first 8 bytes of an IPv6 address
	// This identifies the network, but not the host within
	// the network.  Unless at some point of time we have a
	// global peace treaty and single subnets span multiple
	// countries, this should not be a problem.
	function readip(line, offset) {
		var ii = 0;
		var ip = [];

		for (ii = 0; ii < 2; ii++) {
			ip.push(buffer.readUInt32BE((line * recordSize) + (offset * 16) + (ii * 4)));
		}

		return ip;
	}

	cache.lastIP6 = readip(cache.lastLine6, 1);
	cache.firstIP6 = readip(0, 0);

	var fline = 0;
	var floor = cache.lastIP6;
	var cline = cache.lastLine6;
	var ceil = cache.firstIP6;
	var line;

	if (utils.cmp6(ip, cache.lastIP6) > 0 || utils.cmp6(ip, cache.firstIP6) < 0) {
		return null;
	}

	do {
		line = Math.round((cline - fline) / 2) + fline;
		floor = readip(line, 0);
		ceil  = readip(line, 1);

		if (utils.cmp6(floor, ip) <= 0 && utils.cmp6(ceil, ip) >= 0) {
			if (recordSize === 34) {
				geodata.country = buffer.toString('utf8', (line * recordSize) + 32, (line * recordSize) + 34).replace(/\u0000.*/, '');
			} else {
				geodata.range = [floor, ceil];
				geodata.country = buffer.toString('utf8', (line * recordSize) + 32, (line * recordSize) + 34).replace(/\u0000.*/, '');
				geodata.region = buffer.toString('utf8', (line * recordSize) + 34, (line * recordSize) + 36).replace(/\u0000.*/, '');
				geodata.ll = [buffer.readInt32BE((line * recordSize) + 36) / 10000, buffer.readInt32BE((line * recordSize) + 40) / 10000];
				geodata.city = buffer.toString('utf8', (line * recordSize) + 44, (line * recordSize) + recordSize).replace(/\u0000.*/, '');
			}

			// We do not currently have detailed region/city info for IPv6, but finally have coords
			return geodata;
		} else if (fline === cline) {
			return null;
		} else if (fline === (cline - 1)) {
			if (line === fline) {
				fline = cline;
			} else {
				cline = fline;
			}
		} else if (utils.cmp6(floor, ip) > 0) {
			cline = line;
		} else if (utils.cmp6(ceil, ip) < 0) {
			fline = line;
		}
	} while(1);
}

function preload() {
	var datFile;
	var datSize;

	try {
		datFile = fs.openSync(dataFiles.cityNames, 'r');
		datSize = fs.fstatSync(datFile).size;

		cache.locationBuffer = new Buffer(datSize);
		fs.readSync(datFile, cache.locationBuffer, 0, datSize, 0);
		fs.closeSync(datFile);

		datFile = fs.openSync(dataFiles.city, 'r');
		datSize = fs.fstatSync(datFile).size;
	} catch(err) {
		if (err.code !== 'ENOENT' && err.code !== 'EBADF') {
			throw err;
		}

		datFile = fs.openSync(dataFiles.country, 'r');
		datSize = fs.fstatSync(datFile).size;
		cache.recordSize = 10;
	}

	cache.mainBuffer = new Buffer(datSize);
	fs.readSync(datFile, cache.mainBuffer, 0, datSize, 0);

	fs.closeSync(datFile);

	cache.lastLine = (datSize / cache.recordSize) - 1;
	cache.lastIP = cache.mainBuffer.readUInt32BE((cache.lastLine * cache.recordSize) + 4);
	cache.firstIP = cache.mainBuffer.readUInt32BE(0);
}

function preload6() {
	var datFile;
	var datSize;

	try {
		datFile = fs.openSync(dataFiles.city6, 'r');
		datSize = fs.fstatSync(datFile).size;
	} catch(err) {
		if (err.code !== 'ENOENT' && err.code !== 'EBADF') {
			throw err;
		}

		datFile = fs.openSync(dataFiles.country6, 'r');
		datSize = fs.fstatSync(datFile).size;
		cache.recordSize6 = 34;
	}

	cache.mainBuffer6 = new Buffer(datSize);
	fs.readSync(datFile, cache.mainBuffer6, 0, datSize, 0);

	fs.closeSync(datFile);

	cache.lastLine6 = (datSize / cache.recordSize6) - 1;
}

module.exports = {
	cmp: utils.cmp,

	lookup: function(ip) {
		if (!ip) {
			return null;
		} else if (typeof ip === 'number') {
			return lookup4(ip);
		} else if (net.isIP(ip) === 4) {
			return lookup4(utils.aton4(ip));
		} else if (net.isIP(ip) === 6) {
			return lookup6(utils.aton6(ip));
		}

		return null;
	},

	pretty: function(n) {
		if (typeof n === 'string') {
			return n;
		} else if (typeof n === 'number') {
			return utils.ntoa4(n);
		} else if (n instanceof Array) {
			return utils.ntoa6(n);
		}

		return n;
	}
};

preload();
preload6();

//lookup4 = gen_lookup('geoip-country.dat', 4);
//lookup6 = gen_lookup('geoip-country6.dat', 16);