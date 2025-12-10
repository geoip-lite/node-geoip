const { describe, expect, it } = require('@jest/globals');
const utils = require('../utils.js');

describe('Utility Functions', () => {
	describe('#aton4', () => {
		it('should convert IPv4 string to number', () => {
			expect(utils.aton4('0.0.0.0')).toBe(0);
			expect(utils.aton4('127.0.0.1')).toBe(2130706433);
			expect(utils.aton4('192.168.1.1')).toBe(3232235777);
			expect(utils.aton4('255.255.255.255')).toBe(4294967295);
		});

		it('should handle edge cases', () => {
			expect(utils.aton4('1.1.1.1')).toBe(16843009);
			expect(utils.aton4('8.8.8.8')).toBe(134744072);
			expect(utils.aton4('10.0.0.0')).toBe(167772160);
		});
	});

	describe('#ntoa4', () => {
		it('should convert number to IPv4 string', () => {
			expect(utils.ntoa4(0)).toBe('0.0.0.0');
			expect(utils.ntoa4(2130706433)).toBe('127.0.0.1');
			expect(utils.ntoa4(3232235777)).toBe('192.168.1.1');
			expect(utils.ntoa4(4294967295)).toBe('255.255.255.255');
		});

		it('should handle edge cases', () => {
			expect(utils.ntoa4(16843009)).toBe('1.1.1.1');
			expect(utils.ntoa4(134744072)).toBe('8.8.8.8');
			expect(utils.ntoa4(167772160)).toBe('10.0.0.0');
		});

		it('should round-trip with aton4', () => {
			const ips = ['1.2.3.4', '192.168.0.1', '10.20.30.40', '172.16.0.1'];
			ips.forEach(ip => {
				expect(utils.ntoa4(utils.aton4(ip))).toBe(ip);
			});
		});
	});

	describe('#aton6', () => {
		it('should convert IPv6 string to array', () => {
			const result = utils.aton6('::1');
			expect(result).toBeInstanceOf(Array);
			expect(result.length).toBe(4);
			// ::1 should convert to an array of 4 numbers
			expect(result[3]).toBe(1);
		});

		it('should handle full IPv6 addresses', () => {
			const result = utils.aton6('2001:0db8:0000:0000:0000:0000:0000:0001');
			expect(result).toBeInstanceOf(Array);
			expect(result.length).toBe(4);
		});

		it('should handle compressed IPv6 addresses', () => {
			const result = utils.aton6('2001:db8::1');
			expect(result).toBeInstanceOf(Array);
			expect(result.length).toBe(4);
		});

		it('should handle IPv6 with trailing colon', () => {
			const result = utils.aton6('fe80::');
			expect(result).toBeInstanceOf(Array);
			expect(result.length).toBe(4);
		});
	});

	describe('#ntoa6', () => {
		it('should convert array to IPv6 string', () => {
			const result = utils.ntoa6([0, 0, 0, 1]);
			expect(result).toContain('::');
			expect(result.startsWith('[')).toBe(true);
			expect(result.endsWith(']')).toBe(true);
		});

		it('should handle non-zero values', () => {
			const result = utils.ntoa6([0x20010db8, 0, 0, 1]);
			expect(result).toContain('2001:db8');
		});
	});

	describe('#cmp', () => {
		it('should compare numbers correctly', () => {
			expect(utils.cmp(1, 2)).toBe(-1);
			expect(utils.cmp(2, 1)).toBe(1);
			expect(utils.cmp(5, 5)).toBe(0);
		});

		it('should handle large numbers', () => {
			expect(utils.cmp(4294967295, 4294967294)).toBe(1);
			expect(utils.cmp(0, 4294967295)).toBe(-1);
		});

		it('should delegate to cmp6 for arrays', () => {
			const result = utils.cmp([1, 2], [1, 3]);
			expect(result).toBe(-1);
		});

		it('should return null for invalid types', () => {
			expect(utils.cmp('string', 5)).toBeNull();
			expect(utils.cmp({}, [])).toBeNull();
		});
	});

	describe('#cmp6', () => {
		it('should compare IPv6 arrays correctly', () => {
			expect(utils.cmp6([0, 0], [0, 1])).toBe(-1);
			expect(utils.cmp6([0, 1], [0, 0])).toBe(1);
			expect(utils.cmp6([5, 10], [5, 10])).toBe(0);
		});

		it('should compare first element priority', () => {
			expect(utils.cmp6([1, 100], [2, 0])).toBe(-1);
			expect(utils.cmp6([2, 0], [1, 100])).toBe(1);
		});

		it('should handle equal first elements', () => {
			expect(utils.cmp6([1, 2], [1, 3])).toBe(-1);
			expect(utils.cmp6([1, 3], [1, 2])).toBe(1);
		});
	});

	describe('#isPrivateIP', () => {
		it('should detect private IPv4 addresses', () => {
			expect(utils.isPrivateIP('10.0.0.1')).toBe(true);
			expect(utils.isPrivateIP('10.255.255.255')).toBe(true);
			expect(utils.isPrivateIP('192.168.0.1')).toBe(true);
			expect(utils.isPrivateIP('192.168.255.255')).toBe(true);
			expect(utils.isPrivateIP('172.16.0.1')).toBe(true);
			expect(utils.isPrivateIP('127.0.0.1')).toBe(true);
			expect(utils.isPrivateIP('169.254.1.1')).toBe(true);
		});

		it('should detect private IPv6 addresses', () => {
			expect(utils.isPrivateIP('fc00::1')).toBe(true);
			expect(utils.isPrivateIP('fe80::1')).toBe(true);
		});

		it('should not detect public IP addresses as private', () => {
			expect(utils.isPrivateIP('8.8.8.8')).toBe(false);
			expect(utils.isPrivateIP('1.1.1.1')).toBe(false);
			expect(utils.isPrivateIP('172.15.0.1')).toBe(false);
			expect(utils.isPrivateIP('172.32.0.1')).toBe(false);
			expect(utils.isPrivateIP('2001:db8::1')).toBe(false);
		});
	});
});
