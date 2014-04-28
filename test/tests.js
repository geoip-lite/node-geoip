var geoip = require('../lib/geoip');

module.exports = {
	testLookup: function(test) {
		test.expect(2);

		var ip = '8.8.4.4';
		var ipv6 = '2001:4860:b002::68';

		var actual = geoip.lookup(ip);

		test.ok(actual, 'should return data about IPv4.');

		actual = geoip.lookup(ipv6);

		test.ok(actual, 'should return data about IPv6.');

		test.done();
	},

	testRegionName: function(test){
		test.expect(3);

		var actual = geoip.regionName('AF', '06');

		test.equal(actual, 'Farah');

		actual = geoip.regionName('AF', 6);

		test.equal(actual, 'Farah');

		actual = geoip.regionName('US', 'AL');

		test.equal(actual, 'Alabama');

		test.done();
	},

	testUTF8: function(test) {
		test.expect(2);

		var ip = "31.17.105.227";
		var expected = "Neumünster";
		var actual = geoip.lookup(ip);

		test.ok(actual, "Should return a non-null value for " + ip);
		test.equal(actual.city, expected, "UTF8 city name does not match");
		
		test.done();
	}
};
