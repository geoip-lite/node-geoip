const geoIp2 = require('../dist/main.js');

describe('Advanced GeoIP2 Tests', () => {
	describe('#IPv6Formats', () => {
		it('should handle compressed IPv6 addresses', () => {
			const result = geoIp2.lookup('2001:4860:4860::8888');
			expect(result).toBeTruthy();
		});

		it('should handle full IPv6 addresses', () => {
			const result = geoIp2.lookup('2001:4860:4860:0000:0000:0000:0000:8888');
			expect(result).not.toBeNull();
		});

		it('should handle IPv6 loopback', () => {
			const result = geoIp2.lookup('::1');
			expect(result).toBeNull(); // Loopback should not have geo data
		});

		it('should handle IPv6 with mixed notation', () => {
			const result = geoIp2.lookup('::ffff:8.8.8.8');
			expect(result).not.toBeNull();
		});

		it('should handle different IPv4-mapped IPv6 formats', () => {
			const result1 = geoIp2.lookup('::FFFF:1.1.1.1');
			const result2 = geoIp2.lookup('0:0:0:0:0:FFFF:1.1.1.1');
			expect(result1).not.toBeNull();
			expect(result2).not.toBeNull();
		});
	});

	describe('#PrivateIPAddresses', () => {
		it('should return null for 10.x.x.x range', () => {
			expect(geoIp2.lookup('10.0.0.1')).toBeNull();
			expect(geoIp2.lookup('10.128.0.1')).toBeNull();
			expect(geoIp2.lookup('10.255.255.254')).toBeNull();
		});

		it('should return null for 172.16.x.x - 172.31.x.x range', () => {
			expect(geoIp2.lookup('172.16.0.1')).toBeNull();
			expect(geoIp2.lookup('172.20.0.1')).toBeNull();
			expect(geoIp2.lookup('172.31.255.254')).toBeNull();
		});

		it('should return null for 192.168.x.x range', () => {
			expect(geoIp2.lookup('192.168.0.1')).toBeNull();
			expect(geoIp2.lookup('192.168.1.1')).toBeNull();
			expect(geoIp2.lookup('192.168.255.254')).toBeNull();
		});

		it('should return null for localhost', () => {
			expect(geoIp2.lookup('127.0.0.1')).toBeNull();
			expect(geoIp2.lookup('127.0.0.255')).toBeNull();
		});

		it('should return data for public IPs near private ranges', () => {
			expect(geoIp2.lookup('9.255.255.255')).not.toBeNull();
			expect(geoIp2.lookup('11.0.0.1')).not.toBeNull();
			expect(geoIp2.lookup('172.15.255.255')).not.toBeNull();
			expect(geoIp2.lookup('172.32.0.1')).not.toBeNull();
		});
	});

	describe('#NumberInput', () => {
		it('should accept number input for IPv4', () => {
			const num = 16843009; // 1.1.1.1
			const result = geoIp2.lookup(num);
			expect(result).not.toBeNull();
		});

		it('should handle zero', () => {
			const result = geoIp2.lookup(0);
			expect(result).toBeNull();
		});

		it('should handle max IPv4 number', () => {
			const result = geoIp2.lookup(4294967295);
			// 255.255.255.255 is broadcast, may or may not have data
			expect(result === null || typeof result === 'object').toBe(true);
		});
	});

	describe('#PrettyFunction', () => {
		it('should return string as-is', () => {
			expect(geoIp2.pretty('1.2.3.4')).toBe('1.2.3.4');
		});

		it('should convert number to IPv4', () => {
			const result = geoIp2.pretty(16843009);
			expect(result).toBe('1.1.1.1');
		});

		it('should convert array to IPv6', () => {
			const result = geoIp2.pretty([0, 0, 0, 1]);
			expect(result).toContain('::');
		});

		it('should return other types unchanged', () => {
			expect(geoIp2.pretty(null)).toBeNull();
			expect(geoIp2.pretty(undefined)).toBeUndefined();
		});
	});

	describe('#DataStructure', () => {
		it('should return correct data structure', () => {
			const result = geoIp2.lookup('8.8.8.8');
			expect(result).toHaveProperty('range');
			expect(result).toHaveProperty('country');
			expect(result).toHaveProperty('region');
			expect(result).toHaveProperty('eu');
			expect(result).toHaveProperty('timezone');
			expect(result).toHaveProperty('city');
			expect(result).toHaveProperty('ll');
			expect(result).toHaveProperty('metro');
			expect(result).toHaveProperty('area');
		});

		it('should have array for range', () => {
			const result = geoIp2.lookup('8.8.8.8');
			expect(Array.isArray(result.range)).toBe(true);
			expect(result.range.length).toBe(2);
		});

		it('should have array for ll (latitude/longitude)', () => {
			const result = geoIp2.lookup('8.8.8.8');
			expect(Array.isArray(result.ll)).toBe(true);
			expect(result.ll.length).toBe(2);
		});

		it('should have valid latitude/longitude values', () => {
			const result = geoIp2.lookup('8.8.8.8');
			expect(typeof result.ll[0]).toBe('number');
			expect(typeof result.ll[1]).toBe('number');
			expect(result.ll[0]).toBeGreaterThanOrEqual(-90);
			expect(result.ll[0]).toBeLessThanOrEqual(90);
			expect(result.ll[1]).toBeGreaterThanOrEqual(-180);
			expect(result.ll[1]).toBeLessThanOrEqual(180);
		});
	});

	describe('#MoreCountries', () => {
		it('should return data for various public IPs', () => {
			// Test multiple public IPs have geo data
			const ips = [
				'5.1.83.0', // Europe
				'5.39.0.0', // Europe
				'5.62.0.0', // Europe
				'1.0.1.0', // Asia
				'1.128.0.0', // Asia/Pacific
				'177.0.0.0', // South America
				'14.96.0.0', // Asia
				'24.48.0.0', // North America
			];

			ips.forEach(ip => {
				const result = geoIp2.lookup(ip);
				expect(result).not.toBeNull();
				expect(result.country).toBeTruthy();
				expect(result.country.length).toBe(2); // ISO 2-letter code
			});
		});

		it('should return valid country codes', () => {
			const testIps = ['8.8.8.8', '1.1.1.1', '72.229.28.185'];

			testIps.forEach(ip => {
				const result = geoIp2.lookup(ip);
				if (result && result.country) {
					expect(result.country).toMatch(/^[A-Z]{2}$/);
				}
			});
		});

		it('should return data with timezones', () => {
			const result = geoIp2.lookup('8.8.8.8');
			expect(result).not.toBeNull();
			expect(result.timezone).toBeTruthy();
			expect(result.timezone).toContain('/');
		});
	});

	describe('#EUFlag', () => {
		it('should have EU flag "1" for EU countries', () => {
			const poland = geoIp2.lookup('104.113.255.255');
			expect(poland.eu).toBe('1');

			const netherlands = geoIp2.lookup('2001:1c04:400::1');
			expect(netherlands.eu).toBe('1');
		});

		it('should have EU flag "0" for non-EU countries', () => {
			const us = geoIp2.lookup('72.229.28.185');
			expect(us.eu).toBe('0');

			const japan = geoIp2.lookup('210.138.184.59');
			expect(japan.eu).toBe('0');
		});
	});

	describe('#Version', () => {
		it('should have a version property', () => {
			expect(geoIp2.version).toBeDefined();
			expect(typeof geoIp2.version).toBe('string');
		});

		it('should match package.json version', () => {
			const packageJson = require('../package.json');
			expect(geoIp2.version).toBe(packageJson.version);
		});
	});

	describe('#EdgeCases', () => {
		it('should handle undefined input', () => {
			const result = geoIp2.lookup(undefined);
			expect(result).toBeNull();
		});

		it('should handle boolean input', () => {
			const result = geoIp2.lookup(true);
			expect(result).toBeNull();
		});

		it('should handle object input', () => {
			const result = geoIp2.lookup({});
			expect(result).toBeNull();
		});

		it('should handle array input', () => {
			const result = geoIp2.lookup([]);
			expect(result).toBeNull();
		});

		it('should handle negative numbers', () => {
			const result = geoIp2.lookup(-1);
			expect(result).toBeNull();
		});

		it('should handle numbers larger than max IPv4', () => {
			const result = geoIp2.lookup(4294967296);
			expect(result).toBeNull();
		});

		it('should handle IPv4 with leading zeros', () => {
			const result = geoIp2.lookup('008.008.008.008');
			// This may or may not work depending on implementation
			// Just verify it doesn't crash
			expect(result === null || typeof result === 'object').toBe(true);
		});

		it('should handle malformed IPv6', () => {
			expect(geoIp2.lookup('2001:db8:::1')).toBeNull();
			expect(geoIp2.lookup('gggg::1')).toBeNull();
			// Malformed addresses should return null
			const result = geoIp2.lookup('2001:db8');
			expect(result === null || typeof result === 'object').toBe(true);
		});

		it('should handle IPv6 with too many segments', () => {
			const result = geoIp2.lookup('1:2:3:4:5:6:7:8:9');
			expect(result).toBeNull();
		});
	});

	describe('#ConsistencyChecks', () => {
		it('should return same result for repeated lookups', () => {
			const ip = '8.8.8.8';
			const result1 = geoIp2.lookup(ip);
			const result2 = geoIp2.lookup(ip);
			expect(result1).toEqual(result2);
		});

		it('should handle concurrent lookups', () => {
			const ips = ['1.1.1.1', '8.8.8.8', '4.4.4.4'];
			const results = ips.map(ip => geoIp2.lookup(ip));
			results.forEach(result => {
				expect(result).not.toBeNull();
			});
		});
	});

	describe('#RangeBoundaries', () => {
		it('should handle IPs at range boundaries', () => {
			const result = geoIp2.lookup('0.0.0.1');
			// Either has data or doesn't, shouldn't crash
			expect(result === null || typeof result === 'object').toBe(true);
		});

		it('should handle high-end IP addresses', () => {
			const result = geoIp2.lookup('255.255.255.254');
			expect(result === null || typeof result === 'object').toBe(true);
		});
	});
});
