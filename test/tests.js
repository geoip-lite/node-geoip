var geoip = require('../lib/geoip');
var ip = '8.8.4.4';
var ipv6 = '2001:4860:b002::68';

module.exports = {
	testLookup: function(test) {
		test.expect(2);

		var actual = geoip.lookup(ip);

		test.ok(actual, 'should return data about IPv4.');

		actual = geoip.lookup(ipv6);

		test.ok(actual, 'should return data about IPv6.');

		test.done();
	}
};