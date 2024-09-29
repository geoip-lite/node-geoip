const fs = require('fs');
const { isIP } = require('net');
const path = require('path');
const async = require('async');
const { aton4, aton6, cmp6, ntoa4, ntoa6, cmp } = require('./utils.js');
const fsWatcher = require('./fsWatcher.js');
const { version } = require('../package.json');

fs.existsSync = fs.existsSync || path.existsSync;

const watcherName = 'dataWatcher';

const geoDataDir = path.resolve(
	__dirname,
	global.geoDataDir || process.env.geoDataDIR || '../data/'
);

const dataFiles = {
	city: path.join(geoDataDir, 'geoip-city.dat'),
	city6: path.join(geoDataDir, 'geoip-city6.dat'),
	cityNames: path.join(geoDataDir, 'geoip-city-names.dat'),
	country: path.join(geoDataDir, 'geoip-country.dat'),
	country6: path.join(geoDataDir, 'geoip-country6.dat')
};

const privateRange4 = [
	[aton4('10.0.0.0'), aton4('10.255.255.255')],
	[aton4('172.16.0.0'), aton4('172.31.255.255')],
	[aton4('192.168.0.0'), aton4('192.168.255.255')]
];

const conf4 = {
	firstIP: null,
	lastIP: null,
	lastLine: 0,
	locationBuffer: null,
	locationRecordSize: 88,
	mainBuffer: null,
	recordSize: 24
};

const conf6 = {
	firstIP: null,
	lastIP: null,
	lastLine: 0,
	mainBuffer: null,
	recordSize: 48
};

// Copy original configs
let cache4 = JSON.parse(JSON.stringify(conf4));
let cache6 = JSON.parse(JSON.stringify(conf6));

const RECORD_SIZE = 10;
const RECORD_SIZE6 = 34;

const geoData = {
	range: '',
	country: '',
	region: '',
	eu:'',
	timezone:'',
	city: '',
	ll: [0, 0]
};

const lookup4 = ip => {
	let fline = 0;
	let floor = cache4.lastIP;
	let cline = cache4.lastLine;
	let ceil = cache4.firstIP;
	let line;
	let locId;

	const buffer = cache4.mainBuffer;
	const locBuffer = cache4.locationBuffer;
	const privateRange = privateRange4;
	const recordSize = cache4.recordSize;
	const locRecordSize = cache4.locationRecordSize;

	let i;

	// Outside IPv4 range
	if (ip > cache4.lastIP || ip < cache4.firstIP) return null;

	// Private IP
	for (i = 0; i < privateRange.length; i++) {
		if (ip >= privateRange[i][0] && ip <= privateRange[i][1]) return null;
	}

	do {
		line = Math.round((cline - fline) / 2) + fline;
		floor = buffer.readUInt32BE(line * recordSize);
		ceil = buffer.readUInt32BE((line * recordSize) + 4);

		if (floor <= ip && ceil >= ip) {
			geoData.range = [floor, ceil];

			if (recordSize === RECORD_SIZE) {
				geoData.country = buffer.toString('utf8', (line * recordSize) + 8, (line * recordSize) + 10);
			} else {
				locId = buffer.readUInt32BE((line * recordSize) + 8);

				// -1>>>0 is a marker for "No Location Info"
				if (-1 >>> 0 > locId) {
					geoData.country = locBuffer.toString('utf8', (locId * locRecordSize), (locId * locRecordSize) + 2).replace(/\u0000.*/, '');
					geoData.region = locBuffer.toString('utf8', (locId * locRecordSize) + 2, (locId * locRecordSize) + 5).replace(/\u0000.*/, '');
					geoData.metro = locBuffer.readInt32BE((locId * locRecordSize) + 5);
					geoData.ll[0] = buffer.readInt32BE((line * recordSize) + 12) / 10000;// latitude
					geoData.ll[1] = buffer.readInt32BE((line * recordSize) + 16) / 10000; // longitude
					geoData.area = buffer.readUInt32BE((line * recordSize) + 20); // longitude
					geoData.eu = locBuffer.toString('utf8', (locId * locRecordSize) + 9, (locId * locRecordSize) + 10).replace(/\u0000.*/, '');
					geoData.timezone = locBuffer.toString('utf8', (locId * locRecordSize) + 10, (locId * locRecordSize) + 42).replace(/\u0000.*/, '');
					geoData.city = locBuffer.toString('utf8', (locId * locRecordSize) + 42, (locId * locRecordSize) + locRecordSize).replace(/\u0000.*/, '');
				}
			}

			return geoData;
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
	} while (1);
};

const lookup6 = ip => {
	const buffer = cache6.mainBuffer;
	const recordSize = cache6.recordSize;
	const locBuffer = cache4.locationBuffer;
	const locRecordSize = cache4.locationRecordSize;

	const readIp = (line, offset) => {
		let ii;
		const ipArray = [];

		for (ii = 0; ii < 2; ii++) {
			ipArray.push(buffer.readUInt32BE((line * recordSize) + (offset * 16) + (ii * 4)));
		}

		return ipArray;
	};

	cache6.lastIP = readIp(cache6.lastLine, 1);
	cache6.firstIP = readIp(0, 0);

	let fline = 0;
	let floor = cache6.lastIP;
	let cline = cache6.lastLine;
	let ceil = cache6.firstIP;
	let line;
	let locId;

	if (cmp6(ip, cache6.lastIP) > 0 || cmp6(ip, cache6.firstIP) < 0) return null;

	do {
		line = Math.round((cline - fline) / 2) + fline;
		floor = readIp(line, 0);
		ceil = readIp(line, 1);

		if (cmp6(floor, ip) <= 0 && cmp6(ceil, ip) >= 0) {
			if (recordSize === RECORD_SIZE6) {
				geoData.country = buffer.toString('utf8', (line * recordSize) + 32, (line * recordSize) + 34).replace(/\u0000.*/, '');
			} else {
				locId = buffer.readUInt32BE((line * recordSize) + 32);

				// -1>>>0 is a marker for "No Location Info"
				if (-1 >>> 0 > locId) {
					geoData.country = locBuffer.toString('utf8', (locId * locRecordSize), (locId * locRecordSize) + 2).replace(/\u0000.*/, '');
					geoData.region = locBuffer.toString('utf8', (locId * locRecordSize) + 2, (locId * locRecordSize) + 5).replace(/\u0000.*/, '');
					geoData.metro = locBuffer.readInt32BE((locId * locRecordSize) + 5);
					geoData.ll[0] = buffer.readInt32BE((line * recordSize) + 36) / 10000;// latitude
					geoData.ll[1] = buffer.readInt32BE((line * recordSize) + 40) / 10000; // longitude
					geoData.area = buffer.readUInt32BE((line * recordSize) + 44); // area
					geoData.eu = locBuffer.toString('utf8', (locId * locRecordSize) + 9, (locId * locRecordSize) + 10).replace(/\u0000.*/, '');
					geoData.timezone = locBuffer.toString('utf8', (locId * locRecordSize) + 10, (locId * locRecordSize) + 42).replace(/\u0000.*/, '');
					geoData.city = locBuffer.toString('utf8', (locId * locRecordSize) + 42, (locId * locRecordSize) + locRecordSize).replace(/\u0000.*/, '');
				}
			}
			// We do not currently have detailed region/city info for IPv6, but finally have coords
			return geoData;
		} else if (fline === cline) {
			return null;
		} else if (fline === (cline - 1)) {
			if (line === fline) {
				fline = cline;
			} else {
				cline = fline;
			}
		} else if (cmp6(floor, ip) > 0) {
			cline = line;
		} else if (cmp6(ceil, ip) < 0) {
			fline = line;
		}
	} while (1);
};

const v6prefixes = ['0:0:0:0:0:FFFF:', '::FFFF:'];
const get4mapped = ip => {
	const ipv6 = ip.toUpperCase();
	for (let i = 0; i < v6prefixes.length; i++) {
		const v6prefix = v6prefixes[i];
		if (ipv6.indexOf(v6prefix) === 0) return ipv6.substring(v6prefix.length);
	}
	return null;
};

function preload(callback) {
	let datFile;
	let datSize;
	const asyncCache = JSON.parse(JSON.stringify(conf4));

	// When the preload function receives a callback, do the task asynchronously
	if (typeof arguments[0] === 'function') {
		async.series([
			cb => {
				async.series([
					cb2 => {
						fs.open(dataFiles.cityNames, 'r', (err, file) => {
							datFile = file;
							cb2(err);
						});
					},
					cb2 => {
						fs.fstat(datFile, (err, stats) => {
							datSize = stats.size;
							asyncCache.locationBuffer = Buffer.alloc(datSize);
							cb2(err);
						});
					},
					cb2 => {
						fs.read(datFile, asyncCache.locationBuffer, 0, datSize, 0, cb2);
					},
					cb2 => {
						fs.close(datFile, cb2);
					},
					cb2 => {
						fs.open(dataFiles.city, 'r', (err, file) => {
							datFile = file;
							cb2(err);
						});
					},
					cb2 => {
						fs.fstat(datFile, (err, stats) => {
							datSize = stats.size;
							cb2(err);
						});
					}
				], err => {
					if (err) {
						if (err.code !== 'ENOENT' && err.code !== 'EBADF') {
							throw err;
						}

						fs.open(dataFiles.country, 'r', (err, file) => {
							if (err) {
								cb(err);
							} else {
								datFile = file;
								fs.fstat(datFile, (err, stats) => {
									datSize = stats.size;
									asyncCache.recordSize = RECORD_SIZE;

									cb();
								});
							}
						});

					} else {
						cb();
					}
				});
			}, () => {
				asyncCache.mainBuffer = Buffer.alloc(datSize);

				async.series([
					cb2 => {
						fs.read(datFile, asyncCache.mainBuffer, 0, datSize, 0, cb2);
					},
					cb2 => {
						fs.close(datFile, cb2);
					}
				], err => {
					if (!err) {
						asyncCache.lastLine = (datSize / asyncCache.recordSize) - 1;
						asyncCache.lastIP = asyncCache.mainBuffer.readUInt32BE((asyncCache.lastLine * asyncCache.recordSize) + 4);
						asyncCache.firstIP = asyncCache.mainBuffer.readUInt32BE(0);
						cache4 = asyncCache;
					}
					callback(err);
				});
			}
		]);
	} else {
		try {
			datFile = fs.openSync(dataFiles.cityNames, 'r');
			datSize = fs.fstatSync(datFile).size;

			if (datSize === 0) {
				throw { code: 'EMPTY_FILE' };
			}

			cache4.locationBuffer = Buffer.alloc(datSize);
			fs.readSync(datFile, cache4.locationBuffer, 0, datSize, 0);
			fs.closeSync(datFile);

			datFile = fs.openSync(dataFiles.city, 'r');
			datSize = fs.fstatSync(datFile).size;
		} catch (err) {
			if (err.code !== 'ENOENT' && err.code !== 'EBADF' && err.code !== 'EMPTY_FILE') {
				throw err;
			}

			datFile = fs.openSync(dataFiles.country, 'r');
			datSize = fs.fstatSync(datFile).size;
			cache4.recordSize = RECORD_SIZE;
		}

		cache4.mainBuffer = Buffer.alloc(datSize);
		fs.readSync(datFile, cache4.mainBuffer, 0, datSize, 0);
		fs.closeSync(datFile);

		cache4.lastLine = (datSize / cache4.recordSize) - 1;
		cache4.lastIP = cache4.mainBuffer.readUInt32BE((cache4.lastLine * cache4.recordSize) + 4);
		cache4.firstIP = cache4.mainBuffer.readUInt32BE(0);
	}
}

function preload6(callback) {
	let datFile;
	let datSize;
	const asyncCache6 = JSON.parse(JSON.stringify(conf6));

	// When the preload function receives a callback, do the task asynchronously
	if (typeof arguments[0] === 'function') {
		async.series([
			cb => {
				async.series([
					cb2 => {
						fs.open(dataFiles.city6, 'r', (err, file) => {
							datFile = file;
							cb2(err);
						});
					},
					cb2 => {
						fs.fstat(datFile, (err, stats) => {
							datSize = stats.size;
							cb2(err);
						});
					}
				], err => {
					if (err) {
						if (err.code !== 'ENOENT' && err.code !== 'EBADF') {
							throw err;
						}

						fs.open(dataFiles.country6, 'r', (err, file) => {
							if (err) {
								cb(err);
							} else {
								datFile = file;
								fs.fstat(datFile, (err, stats) => {
									datSize = stats.size;
									asyncCache6.recordSize = RECORD_SIZE6;

									cb();
								});
							}
						});
					} else {
						cb();
					}
				});
			}, () => {
				asyncCache6.mainBuffer = Buffer.alloc(datSize);

				async.series([
					cb2 => {
						fs.read(datFile, asyncCache6.mainBuffer, 0, datSize, 0, cb2);
					},
					cb2 => {
						fs.close(datFile, cb2);
					}
				], err => {
					if (!err) {
						asyncCache6.lastLine = (datSize / asyncCache6.recordSize) - 1;
						cache6 = asyncCache6;
					}
					callback(err);
				});
			}
		]);
	} else {
		try {
			datFile = fs.openSync(dataFiles.city6, 'r');
			datSize = fs.fstatSync(datFile).size;

			if (datSize === 0) {
				throw { code: 'EMPTY_FILE' };
			}
		} catch (err) {
			if (err.code !== 'ENOENT' && err.code !== 'EBADF' && err.code !== 'EMPTY_FILE') {
				throw err;
			}

			datFile = fs.openSync(dataFiles.country6, 'r');
			datSize = fs.fstatSync(datFile).size;
			cache6.recordSize = RECORD_SIZE6;
		}

		cache6.mainBuffer = Buffer.alloc(datSize);
		fs.readSync(datFile, cache6.mainBuffer, 0, datSize, 0);
		fs.closeSync(datFile);

		cache6.lastLine = (datSize / cache6.recordSize) - 1;
	}
}

module.exports = {
	cmp,

	lookup: ip => {
		if (!ip) {
			return null;
		} else if (typeof ip === 'number') {
			return lookup4(ip);
		} else if (isIP(ip) === 4) {
			return lookup4(aton4(ip));
		} else if (isIP(ip) === 6) {
			const ipv4 = get4mapped(ip);
			if (ipv4) {
				return lookup4(aton4(ipv4));
			} else {
				return lookup6(aton6(ip));
			}
		}

		return null;
	},

	pretty: n => {
		if (typeof n === 'string') {
			return n;
		} else if (typeof n === 'number') {
			return ntoa4(n);
		} else if (Array.isArray(n)) {
			return ntoa6(n);
		}

		return n;
	},

	// Start watching for data updates. The watcher waits one minute for file transfer to
	// complete before triggering the callback.
	startWatchingDataUpdate: callback => {
		fsWatcher.makeFsWatchFilter(watcherName, geoDataDir, 60 * 1000, async () => {
			// Reload data
			await async.series([
				cb => {
					preload(cb);
				}, cb => {
					preload6(cb);
				}
			], callback);
		});
	},

	// Stop watching for data updates.
	stopWatchingDataUpdate: () => {
		fsWatcher.stopWatching(watcherName);
	},

	// Clear data
	clear: () => {
		cache4 = JSON.parse(JSON.stringify(conf4));
		cache6 = JSON.parse(JSON.stringify(conf6));
	},

	// Reload data synchronously
	reloadDataSync: () => {
		preload();
		preload6();
	},

	// Reload data asynchronously
	reloadData: async callback => {
		// Reload data
		await async.series([
			cb => {
				preload(cb);
			},
			cb => {
				preload6(cb);
			}
		], callback);
	},

	version
};

preload();
preload6();