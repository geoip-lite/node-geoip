// ============================================================================
// Dependencies
// ============================================================================

const { open, fstat, read, close, openSync, fstatSync, readSync, closeSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { isIP } = require('node:net');
const async = require('async');
const { aton4, aton6, cmp6, ntoa4, ntoa6, cmp } = require('./utils.js');
const fsWatcher = require('./fsWatcher.js');
const { version } = require('../package.json');

// ============================================================================
// Configuration
// ============================================================================

const watcherName = 'dataWatcher';

const geoDataDir = resolve(
	__dirname,
	global.geoDataDir || process.env.GEODATADIR || '../data/'
);

const dataFiles = {
	city: join(geoDataDir, 'geoip-city.dat'),
	city6: join(geoDataDir, 'geoip-city6.dat'),
	cityNames: join(geoDataDir, 'geoip-city-names.dat'),
	country: join(geoDataDir, 'geoip-country.dat'),
	country6: join(geoDataDir, 'geoip-country6.dat'),
};

const privateRange4 = [
	[aton4('10.0.0.0'), aton4('10.255.255.255')],
	[aton4('172.16.0.0'), aton4('172.31.255.255')],
	[aton4('192.168.0.0'), aton4('192.168.255.255')],
];

// ============================================================================
// Cache Configuration
// ============================================================================

const conf4 = {
	firstIP: null,
	lastIP: null,
	lastLine: 0,
	locationBuffer: null,
	locationRecordSize: 88,
	mainBuffer: null,
	recordSize: 24,
};

const conf6 = {
	firstIP: null,
	lastIP: null,
	lastLine: 0,
	mainBuffer: null,
	recordSize: 48,
};

let cache4 = { ...conf4 };
let cache6 = { ...conf6 };

const RECORD_SIZE = 10;
const RECORD_SIZE6 = 34;

// ============================================================================
// Helper Functions
// ============================================================================

const removeNullTerminator = str => {
	const nullIndex = str.indexOf('\0');
	return nullIndex === -1 ? str : str.substring(0, nullIndex);
};

const readIp6 = (buffer, line, recordSize, offset) => {
	const ipArray = [];
	for (let i = 0; i < 2; i++) {
		ipArray.push(buffer.readUInt32BE((line * recordSize) + (offset * 16) + (i * 4)));
	}
	return ipArray;
};

// ============================================================================
// IPv4 Lookup Function
// ============================================================================

const lookup4 = ip => {
	let fline = 0;
	let cline = cache4.lastLine;
	let floor = cache4.lastIP;
	let ceil = cache4.firstIP;
	let line, locId;

	const buffer = cache4.mainBuffer;
	const locBuffer = cache4.locationBuffer;
	const privateRange = privateRange4;
	const recordSize = cache4.recordSize;
	const locRecordSize = cache4.locationRecordSize;

	const geoData = {
		range: [null, null],
		country: '',
		region: '',
		eu: '',
		timezone: '',
		city: '',
		ll: [null, null],
		metro: null,
		area: null,
	};

	// Outside IPv4 range
	if (ip > cache4.lastIP || ip < cache4.firstIP) return null;

	// Private IP
	for (let i = 0; i < privateRange.length; i++) {
		if (ip >= privateRange[i][0] && ip <= privateRange[i][1]) return null;
	}

	while (true) {
		line = Math.round((cline - fline) / 2) + fline;
		const offset = line * recordSize;
		floor = buffer.readUInt32BE(offset);
		ceil = buffer.readUInt32BE(offset + 4);

		if (floor <= ip && ceil >= ip) {
			geoData.range = [floor, ceil];

			if (recordSize === RECORD_SIZE) {
				geoData.country = buffer.toString('utf8', offset + 8, offset + 10);
			} else {
				locId = buffer.readUInt32BE(offset + 8);

				// -1>>>0 is a marker for "No Location Info"
				if (-1 >>> 0 > locId) {
					const locOffset = locId * locRecordSize;
					geoData.country = removeNullTerminator(locBuffer.toString('utf8', locOffset, locOffset + 2));
					geoData.region = removeNullTerminator(locBuffer.toString('utf8', locOffset + 2, locOffset + 5));
					geoData.metro = locBuffer.readInt32BE(locOffset + 5);
					geoData.ll[0] = buffer.readInt32BE(offset + 12) / 10000; // latitude
					geoData.ll[1] = buffer.readInt32BE(offset + 16) / 10000; // longitude
					geoData.area = buffer.readUInt32BE(offset + 20);
					geoData.eu = removeNullTerminator(locBuffer.toString('utf8', locOffset + 9, locOffset + 10));
					geoData.timezone = removeNullTerminator(locBuffer.toString('utf8', locOffset + 10, locOffset + 42));
					geoData.city = removeNullTerminator(locBuffer.toString('utf8', locOffset + 42, locOffset + locRecordSize));
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
	}
};

// ============================================================================
// IPv6 Lookup Function
// ============================================================================

const lookup6 = ip => {
	const buffer = cache6.mainBuffer;
	const recordSize = cache6.recordSize;
	const locBuffer = cache4.locationBuffer;
	const locRecordSize = cache4.locationRecordSize;

	const geoData = {
		range: [null, null],
		country: '',
		region: '',
		eu: '',
		timezone: '',
		city: '',
		ll: [null, null],
		metro: null,
		area: null,
	};

	let fline = 0;
	let cline = cache6.lastLine;
	let floor = cache6.lastIP;
	let ceil = cache6.firstIP;
	let line, locId;

	if (cmp6(ip, cache6.lastIP) > 0 || cmp6(ip, cache6.firstIP) < 0) return null;

	while (true) {
		line = Math.round((cline - fline) / 2) + fline;
		floor = readIp6(buffer, line, recordSize, 0);
		ceil = readIp6(buffer, line, recordSize, 1);

		if (cmp6(floor, ip) <= 0 && cmp6(ceil, ip) >= 0) {
			const offset = line * recordSize;
			if (recordSize === RECORD_SIZE6) {
				geoData.country = removeNullTerminator(buffer.toString('utf8', offset + 32, offset + 34));
			} else {
				locId = buffer.readUInt32BE(offset + 32);

				// -1>>>0 is a marker for "No Location Info"
				if (-1 >>> 0 > locId) {
					const locOffset = locId * locRecordSize;
					geoData.country = removeNullTerminator(locBuffer.toString('utf8', locOffset, locOffset + 2));
					geoData.region = removeNullTerminator(locBuffer.toString('utf8', locOffset + 2, locOffset + 5));
					geoData.metro = locBuffer.readInt32BE(locOffset + 5);
					geoData.ll[0] = buffer.readInt32BE(offset + 36) / 10000; // latitude
					geoData.ll[1] = buffer.readInt32BE(offset + 40) / 10000; // longitude
					geoData.area = buffer.readUInt32BE(offset + 44); // area
					geoData.eu = removeNullTerminator(locBuffer.toString('utf8', locOffset + 9, locOffset + 10));
					geoData.timezone = removeNullTerminator(locBuffer.toString('utf8', locOffset + 10, locOffset + 42));
					geoData.city = removeNullTerminator(locBuffer.toString('utf8', locOffset + 42, locOffset + locRecordSize));
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
	}
};

// ============================================================================
// IPv4-Mapped IPv6 Handler
// ============================================================================

const V6_PREFIX_1 = '0:0:0:0:0:FFFF:';
const V6_PREFIX_2 = '::FFFF:';
const get4mapped = ip => {
	const ipv6 = ip.toUpperCase();
	if (ipv6.startsWith(V6_PREFIX_1)) return ipv6.substring(V6_PREFIX_1.length);
	if (ipv6.startsWith(V6_PREFIX_2)) return ipv6.substring(V6_PREFIX_2.length);
	return null;
};

// ============================================================================
// Data Loading Functions - IPv4
// ============================================================================

function preload(callback) {
	let datFile;
	let datSize;
	const asyncCache = { ...conf4 };

	// When the preload function receives a callback, do the task asynchronously
	if (typeof arguments[0] === 'function') {
		async.series([
			cb => {
				async.series([
					cb2 => {
						open(dataFiles.cityNames, 'r', (err, file) => {
							datFile = file;
							cb2(err);
						});
					},
					cb2 => {
						fstat(datFile, (err, stats) => {
							datSize = stats.size;
							asyncCache.locationBuffer = Buffer.alloc(datSize);
							cb2(err);
						});
					},
					cb2 => {
						read(datFile, asyncCache.locationBuffer, 0, datSize, 0, cb2);
					},
					cb2 => {
						close(datFile, cb2);
					},
					cb2 => {
						open(dataFiles.city, 'r', (err, file) => {
							datFile = file;
							cb2(err);
						});
					},
					cb2 => {
						fstat(datFile, (err, stats) => {
							datSize = stats.size;
							cb2(err);
						});
					},
				], err => {
					if (err) {
						if (err.code !== 'ENOENT' && err.code !== 'EBADF') {
							throw err;
						}

						open(dataFiles.country, 'r', (err, file) => {
							if (err) {
								cb(err);
							} else {
								datFile = file;
								fstat(datFile, (err, stats) => {
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
						read(datFile, asyncCache.mainBuffer, 0, datSize, 0, cb2);
					},
					cb2 => {
						close(datFile, cb2);
					},
				], err => {
					if (!err) {
						asyncCache.lastLine = (datSize / asyncCache.recordSize) - 1;
						asyncCache.lastIP = asyncCache.mainBuffer.readUInt32BE((asyncCache.lastLine * asyncCache.recordSize) + 4);
						asyncCache.firstIP = asyncCache.mainBuffer.readUInt32BE(0);
						cache4 = asyncCache;
					}
					callback(err);
				});
			},
		]);
	} else {
		try {
			datFile = openSync(dataFiles.cityNames, 'r');
			datSize = fstatSync(datFile).size;
			if (datSize === 0) {
				const err = new Error('Empty file');
				err.code = 'EMPTY_FILE';
				throw err;
			}

			cache4.locationBuffer = Buffer.alloc(datSize);
			readSync(datFile, cache4.locationBuffer, 0, datSize, 0);
			closeSync(datFile);

			datFile = openSync(dataFiles.city, 'r');
			datSize = fstatSync(datFile).size;
		} catch (err) {
			if (err.code !== 'ENOENT' && err.code !== 'EBADF' && err.code !== 'EMPTY_FILE') {
				throw err;
			}

			datFile = openSync(dataFiles.country, 'r');
			datSize = fstatSync(datFile).size;
			cache4.recordSize = RECORD_SIZE;
		}

		cache4.mainBuffer = Buffer.alloc(datSize);
		readSync(datFile, cache4.mainBuffer, 0, datSize, 0);
		closeSync(datFile);

		cache4.lastLine = (datSize / cache4.recordSize) - 1;
		cache4.lastIP = cache4.mainBuffer.readUInt32BE((cache4.lastLine * cache4.recordSize) + 4);
		cache4.firstIP = cache4.mainBuffer.readUInt32BE(0);
	}
}

// ============================================================================
// Data Loading Functions - IPv6
// ============================================================================

function preload6(callback) {
	let datFile;
	let datSize;
	const asyncCache6 = { ...conf6 };

	// When the preload function receives a callback, do the task asynchronously
	if (typeof arguments[0] === 'function') {
		async.series([
			cb => {
				async.series([
					cb2 => {
						open(dataFiles.city6, 'r', (err, file) => {
							datFile = file;
							cb2(err);
						});
					},
					cb2 => {
						fstat(datFile, (err, stats) => {
							datSize = stats.size;
							cb2(err);
						});
					},
				], err => {
					if (err) {
						if (err.code !== 'ENOENT' && err.code !== 'EBADF') {
							throw err;
						}

						open(dataFiles.country6, 'r', (err, file) => {
							if (err) {
								cb(err);
							} else {
								datFile = file;
								fstat(datFile, (err, stats) => {
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
						read(datFile, asyncCache6.mainBuffer, 0, datSize, 0, cb2);
					},
					cb2 => {
						close(datFile, cb2);
					},
				], err => {
					if (!err) {
						asyncCache6.lastLine = (datSize / asyncCache6.recordSize) - 1;
						asyncCache6.lastIP = readIp6(asyncCache6.mainBuffer, asyncCache6.lastLine, asyncCache6.recordSize, 1);
						asyncCache6.firstIP = readIp6(asyncCache6.mainBuffer, 0, asyncCache6.recordSize, 0);
						cache6 = asyncCache6;
					}
					callback(err);
				});
			},
		]);
	} else {
		try {
			datFile = openSync(dataFiles.city6, 'r');
			datSize = fstatSync(datFile).size;

			if (datSize === 0) {
				const err = new Error('Empty file');
				err.code = 'EMPTY_FILE';
				throw err;
			}
		} catch (err) {
			if (err.code !== 'ENOENT' && err.code !== 'EBADF' && err.code !== 'EMPTY_FILE') {
				throw err;
			}

			datFile = openSync(dataFiles.country6, 'r');
			datSize = fstatSync(datFile).size;
			cache6.recordSize = RECORD_SIZE6;
		}

		cache6.mainBuffer = Buffer.alloc(datSize);
		readSync(datFile, cache6.mainBuffer, 0, datSize, 0);
		closeSync(datFile);

		cache6.lastLine = (datSize / cache6.recordSize) - 1;
		cache6.lastIP = readIp6(cache6.mainBuffer, cache6.lastLine, cache6.recordSize, 1);
		cache6.firstIP = readIp6(cache6.mainBuffer, 0, cache6.recordSize, 0);
	}
}

// ============================================================================
// Public API
// ============================================================================

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
		fsWatcher.makeFsWatchFilter(watcherName, geoDataDir, 60 * 1000, () => {
			// Reload data
			async.series([
				cb => {
					preload(cb);
				}, cb => {
					preload6(cb);
				},
			], callback);
		});
	},

	// Stop watching for data updates.
	stopWatchingDataUpdate: () => fsWatcher.stopWatching(watcherName),

	// Clear data
	clear: () => {
		cache4 = { ...conf4 };
		cache6 = { ...conf6 };
	},

	// Reload data synchronously
	reloadDataSync: () => {
		preload();
		preload6();
	},

	// Reload data asynchronously
	reloadData: callback => {
		// Reload data
		async.series([
			cb => {
				preload(cb);
			},
			cb => {
				preload6(cb);
			},
		], callback);
	},

	version,
};

// ============================================================================
// Initialize - Load data on module startup
// ============================================================================

preload();
preload6();

// lookup4 = gen_lookup('geoip-country.dat', 4);
// lookup6 = gen_lookup('geoip-country6.dat', 16);