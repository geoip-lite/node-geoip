var geoip = require('../lib/geoip');

module.exports = {
	testCountry: function(test){
		test.expect(1);

		var actual = geoip.countryName('US');

		test.equal(actual, 'United States', 'should return US');

		test.done();
	},

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
