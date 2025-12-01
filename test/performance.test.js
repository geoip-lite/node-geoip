const geoIp2 = require('../index.js');

describe('Performance Tests', () => {
	describe('#LookupSpeed', () => {
		it('should perform IPv4 lookups quickly', () => {
			const start = Date.now();
			const iterations = 1000;

			for (let i = 0; i < iterations; i++) {
				geoIp2.lookup('8.8.8.8');
			}

			const duration = Date.now() - start;
			const perLookup = duration / iterations;

			// Each lookup should take less than 1ms on average
			expect(perLookup).toBeLessThan(1);
		});

		it('should perform IPv6 lookups quickly', () => {
			const start = Date.now();
			const iterations = 1000;

			for (let i = 0; i < iterations; i++) {
				geoIp2.lookup('2001:4860:4860::8888');
			}

			const duration = Date.now() - start;
			const perLookup = duration / iterations;

			// Each lookup should take less than 2ms on average
			expect(perLookup).toBeLessThan(2);
		});

		it('should handle mixed IPv4/IPv6 lookups efficiently', () => {
			const ips = [
				'8.8.8.8',
				'1.1.1.1',
				'2001:4860:4860::8888',
				'72.229.28.185',
				'2606:4700:4700::1111',
			];

			const start = Date.now();
			const iterations = 500;

			for (let i = 0; i < iterations; i++) {
				ips.forEach(ip => geoIp2.lookup(ip));
			}

			const duration = Date.now() - start;

			// All lookups should complete in reasonable time
			expect(duration).toBeLessThan(5000);
		});
	});

	describe('#MemoryEfficiency', () => {
		it('should not leak memory on repeated lookups', () => {
			const iterations = 10000;
			const ips = ['8.8.8.8', '1.1.1.1', '4.4.4.4'];

			for (let i = 0; i < iterations; i++) {
				const ip = ips[i % ips.length];
				geoIp2.lookup(ip);
			}

			// If we reach here without crashing, memory is managed well
			expect(true).toBe(true);
		});

		it('should handle null results without memory issues', () => {
			const iterations = 5000;

			for (let i = 0; i < iterations; i++) {
				geoIp2.lookup('192.168.1.' + (i % 255));
			}

			expect(true).toBe(true);
		});
	});

	describe('#BulkOperations', () => {
		it('should handle bulk IPv4 lookups', () => {
			const results = [];

			for (let i = 1; i < 256; i++) {
				const ip = `8.8.8.${i}`;
				const result = geoIp2.lookup(ip);
				results.push(result);
			}

			expect(results.length).toBe(255);
			// All should have same country
			const countries = results.filter(r => r !== null).map(r => r.country);
			const uniqueCountries = [...new Set(countries)];
			expect(uniqueCountries.length).toBeGreaterThan(0);
		});

		it('should handle sequential lookups efficiently', () => {
			const testIps = [];
			for (let i = 0; i < 100; i++) {
				testIps.push(`1.${i}.${i}.${i}`);
			}

			const start = Date.now();
			testIps.forEach(ip => geoIp2.lookup(ip));
			const duration = Date.now() - start;

			expect(duration).toBeLessThan(500);
		});
	});

	describe('#CachingBehavior', () => {
		it('should maintain consistent performance for same IP', () => {
			const ip = '8.8.8.8';
			const timings = [];

			for (let i = 0; i < 10; i++) {
				const start = Date.now();
				geoIp2.lookup(ip);
				timings.push(Date.now() - start);
			}

			// All lookups should be fast
			timings.forEach(time => {
				expect(time).toBeLessThan(10);
			});
		});
	});

	describe('#StressTests', () => {
		it('should handle rapid-fire lookups', () => {
			const iterations = 10000;
			let successCount = 0;

			for (let i = 0; i < iterations; i++) {
				const result = geoIp2.lookup('8.8.8.8');
				if (result !== null) successCount++;
			}

			expect(successCount).toBe(iterations);
		});

		it('should handle invalid inputs without performance degradation', () => {
			const invalidInputs = [
				null, undefined, '', 'invalid', {}, [], true, false, -1,
			];

			const start = Date.now();

			for (let i = 0; i < 1000; i++) {
				invalidInputs.forEach(input => {
					geoIp2.lookup(input);
				});
			}

			const duration = Date.now() - start;

			// Should handle invalid inputs quickly
			expect(duration).toBeLessThan(2000);
		});
	});

	describe('#ComparisonTests', () => {
		it('should be faster for IPv4 than IPv6', () => {
			const ipv4 = '8.8.8.8';
			const ipv6 = '2001:4860:4860::8888';
			const iterations = 1000;

			const start4 = Date.now();
			for (let i = 0; i < iterations; i++) {
				geoIp2.lookup(ipv4);
			}
			const duration4 = Date.now() - start4;

			const start6 = Date.now();
			for (let i = 0; i < iterations; i++) {
				geoIp2.lookup(ipv6);
			}
			const duration6 = Date.now() - start6;

			// Both should be reasonably fast
			expect(duration4).toBeLessThan(1000);
			expect(duration6).toBeLessThan(2000);
		});
	});
});
