const geoIp2 = require('../lib/main.js');

describe('GeoIP2', () => {
	describe('#testLookup', () => {
		it('should return data about IPv4', () => {
			const ip = '1.1.1.1';
			const actual = geoIp2.lookup(ip);
			expect(actual).toBeTruthy();
		});

		it('should return data about IPv6', () => {
			const actual = geoIp2.lookup('2606:4700:4700::64');
			expect(actual).toBeTruthy();
		});
	});

	describe('#testDataIP4', () => {
		it('should match data for IPv4 - PL', () => {
			const actual = geoIp2.lookup('104.113.255.255');
			expect(actual.country).toBe('PL');
			expect(actual.region).toBe('14');
			expect(actual.eu).toBe('1');
			expect(actual.timezone).toBe('Europe/Warsaw');
			expect(actual.city).toBe('Warsaw');
			expect(actual.ll).toBeTruthy();
			expect(actual.metro).toBe(0);
			expect(actual.area).toBe(20);
		});

		it('should match data for IPv4 - US', () => {
			const actual = geoIp2.lookup('72.229.28.185');
			expect(actual.country).toBe('US');
			expect(actual.region).toBe('NY');
			expect(actual.eu).toBe('0');
			expect(actual.timezone).toBe('America/New_York');
			expect(actual.city).toBe('New York');
			expect(actual.ll).toBeTruthy();
			expect(actual.metro).toBe(501);
			expect(actual.area).toBe(5);
		});

		it('should match data for IPv4 - JP', () => {
			const actual = geoIp2.lookup('210.138.184.59');
			expect(actual.country).toBe('JP');
			expect(actual.eu).toBe('0');
			expect(actual.timezone).toBe('Asia/Tokyo');
			expect(actual.city).toBe('Tokushima');
			expect(actual.ll).toBeTruthy();
			expect(actual.metro).toBe(0);
			expect(actual.area).toBe(500);
		});

		it('should match data for IPv4 - RU', () => {
			const actual = geoIp2.lookup('109.108.63.255');
			expect(actual.country).toBe('RU');
			expect(actual.region).toBe('IVA');
			expect(actual.eu).toBe('0');
			expect(actual.timezone).toBe('Europe/Moscow');
			expect(actual.city).toBe('Nerl\'');
			expect(actual.ll).toBeTruthy();
			expect(actual.metro).toBe(0);
			expect(actual.area).toBe(20);
		});
	});

	describe('#testDataIP6', () => {
		it('should match data for IPv6 - PL', () => {
			const actual = geoIp2.lookup('2a01:118f:30a:3900:c954:e6ef:8067:d4e8');
			expect(actual.country).toBe('PL');
			expect(actual.region).toBe('14');
			expect(actual.eu).toBe('1');
			expect(actual.timezone).toBe('Europe/Warsaw');
			expect(actual.city).toBe('Warsaw');
			expect(actual.ll).toBeTruthy();
			expect(actual.metro).toBe(0);
			expect(actual.area).toBe(200);
		});

		it('should match data for IPv6 - NL ', () => {
			const actual = geoIp2.lookup('2001:1c04:400::1');
			expect(actual.country).toBe('NL');
			expect(actual.region).toBe('NH');
			expect(actual.eu).toBe('1');
			expect(actual.timezone).toBe('Europe/Amsterdam');
			expect(actual.city).toBe('Zandvoort');
			expect(actual.ll).toBeTruthy();
			expect(actual.metro).toBe(0);
			expect(actual.area).toBe(5);
		});

		it('should match data for IPv6 - JP', () => {
			const actual = geoIp2.lookup('2400:8500:1302:814:a163:44:173:238f');
			expect(actual.country).toBe('JP');
			expect(actual.region).toBe('');
			expect(actual.eu).toBe('0');
			expect(actual.timezone).toBe('Asia/Tokyo');
			expect(actual.city).toBe('');
			expect(actual.ll).toBeTruthy();
			expect(actual.metro).toBe(0);
			expect(actual.area).toBe(500);
		});
	});

	describe('#testUTF8', () => {
		it('should return UTF8 city name', () => {
			const actual = geoIp2.lookup('2.139.175.1');
			expect(actual.country).toBe('ES');
			expect(actual.city).toBe('Madrid');
			expect(actual.timezone).toBe('Europe/Madrid');
		});

		it('should match data for IPv4 - PL', () => {
			const actual = geoIp2.lookup('86.63.89.41');
			expect(actual.country).toBe('PL');
			expect(actual.timezone).toBe('Europe/Warsaw');
			expect(actual.city).toBe('Piła');
		});
	});

	describe('#testMetro', () => {
		it('should match metro data', () => {
			const actual = geoIp2.lookup('23.240.63.68');
			expect(actual.metro).toBe(803);
		});
	});

	describe('#testIPv4MappedIPv6', () => {
		it('should match IPv4 mapped IPv6 data', () => {
			const actual = geoIp2.lookup('195.16.170.74');
			expect(actual.metro).toBe(0);
		});
	});

	describe('#testSyncReload', () => {
		it('should reload data synchronously', () => {
			const before4 = geoIp2.lookup('75.82.117.180');
			expect(before4).not.toBeNull();
			const before6 = geoIp2.lookup('::ffff:173.185.182.82');
			expect(before6).not.toBeNull();

			geoIp2.clear();

			const none4 = geoIp2.lookup('75.82.117.180');
			expect(none4).toBeNull();
			const none6 = geoIp2.lookup('::ffff:173.185.182.82');
			expect(none6).toBeNull();

			geoIp2.reloadDataSync();

			const after4 = geoIp2.lookup('75.82.117.180');
			expect(before4).toEqual(after4);
			const after6 = geoIp2.lookup('::ffff:173.185.182.82');
			expect(before6).toEqual(after6);
		});
	});

	describe('#testAsyncReload', () => {
		it('should reload data asynchronously', (done) => {
			const before4 = geoIp2.lookup('75.82.117.180');
			expect(before4).not.toBeNull();
			const before6 = geoIp2.lookup('::ffff:173.185.182.82');
			expect(before6).not.toBeNull();

			geoIp2.clear();

			const none4 = geoIp2.lookup('75.82.117.180');
			expect(none4).toBeNull();
			const none6 = geoIp2.lookup('::ffff:173.185.182.82');
			expect(none6).toBeNull();

			geoIp2.reloadData(() => {
				const after4 = geoIp2.lookup('75.82.117.180');
				expect(before4).toEqual(after4);
				const after6 = geoIp2.lookup('::ffff:173.185.182.82');
				expect(before6).toEqual(after6);

				done();
			});
		});
	});

	describe('#testInvalidIP', () => {
		it('should return null for an invalid IP address', () => {
			const ip = 'invalid_ip_address';
			const actual = geoIp2.lookup(ip);
			expect(actual).toBeNull();
		});
	});

	describe('#testEmptyIP', () => {
		it('should return null for an empty IP address', () => {
			const actual = geoIp2.lookup('');
			expect(actual).toBeNull();
		});
	});

	describe('#testNullIP', () => {
		it('should return null for a null IP address', () => {
			const actual = geoIp2.lookup(null);
			expect(actual).toBeNull();
		});
	});

	describe('#testUnknownIP', () => {
		it('should return null for an unknown IP address', () => {
			const ip = '192.168.0.1'; // Private IP address
			const actual = geoIp2.lookup(ip);
			expect(actual).toBeNull();
		});
	});

	describe('#testNoDataForIP', () => {
		it('should return null for an IP address with no data', () => {
			const ip = '203.0.113.0'; // Example IP with no data
			const actual = geoIp2.lookup(ip);
			expect(actual).toBeNull();
		});
	});

	describe('#testSpecialCharactersIP', () => {
		it('should return null for an IP address with special characters', () => {
			const ip = '20.24.@.&'; // IP with special characters
			const actual = geoIp2.lookup(ip);
			expect(actual).toBeNull();
		});
	});
});