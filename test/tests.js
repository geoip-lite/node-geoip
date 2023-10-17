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
    
	testDataIP4: function(test) {
		test.expect(9);

		var ip = '72.229.28.185';

		var actual = geoip.lookup(ip);

		test.notStrictEqual(actual.range, undefined, 'should contain IPv4 range');

		test.strictEqual(actual.country, 'US', "should match country");

		test.strictEqual(actual.region, 'NY', "should match region");

		test.strictEqual(actual.eu, '0', "should match eu");

		test.strictEqual(actual.timezone, 'America/New_York', "should match timezone");

		test.strictEqual(actual.city, 'New York', "should match city");

		test.ok(actual.ll, 'should contain coordinates');

		test.strictEqual(actual.metro, 501, "should match metro");

		test.strictEqual(actual.area, 1, "should match area");

		test.done();
	},
    
	testDataIP6: function(test) {
		test.expect(9);

		var ipv6 = '2001:1c04:400::1';

		var actual = geoip.lookup(ipv6);

		test.notStrictEqual(actual.range, undefined, 'should contain IPv6 range');

		test.strictEqual(actual.country, 'NL', "should match country");

		test.strictEqual(actual.region, 'NH', "should match region");

		test.strictEqual(actual.eu, '1', "should match eu");

		test.strictEqual(actual.timezone, 'Europe/Amsterdam', "should match timezone");

		test.strictEqual(actual.city, 'Amsterdam', "should match city");

		test.ok(actual.ll, 'should contain coordinates');

		test.strictEqual(actual.metro, 0, "should match metro");

		test.strictEqual(actual.area, 5, "should match area");

		test.done();
	},

	testUTF8: function(test) {
		test.expect(2);

		var ip = "2.139.175.1";
		var expected = "Pamplona";
		var actual = geoip.lookup(ip);

		test.ok(actual, "Should return a non-null value for " + ip);
		test.equal(actual.city, expected, "UTF8 city name does not match");

		test.done();
	},

	testMetro: function(test) {
		test.expect(2);

		var actual = geoip.lookup("23.240.63.68");

		test.equal(actual.city, "Riverside"); //keeps changing with each update from one city to other (close to each other geographically)
		test.equal(actual.metro, 803);

		test.done();
	},

	testIPv4MappedIPv6: function (test) {
		test.expect(2);

		var actual = geoip.lookup("195.16.170.74");

		test.equal(actual.city, "");
		test.equal(actual.metro, 0);

		test.done();
	},
    
	testSyncReload: function (test) {
		test.expect(6);

		//get original data
		var before4 = geoip.lookup("75.82.117.180");
		test.notEqual(before4, null);

		var before6 = geoip.lookup("::ffff:173.185.182.82");
		test.notEqual(before6, null);

		//clear data;
		geoip.clear();

		//make sure data is cleared
		var none4 = geoip.lookup("75.82.117.180");
		test.equal(none4, null);
		var none6 = geoip.lookup("::ffff:173.185.182.82");
		test.equal(none6, null);

		//reload data synchronized
		geoip.reloadDataSync();

		//make sure we have value from before
		var after4 = geoip.lookup("75.82.117.180");
		test.deepEqual(before4, after4);
		var after6 = geoip.lookup("::ffff:173.185.182.82");
		test.deepEqual(before6, after6);

		test.done();
	},
    
	testAsyncReload: function (test) {
		test.expect(6);

		//get original data
		var before4 = geoip.lookup("75.82.117.180");
		test.notEqual(before4, null);
		var before6 = geoip.lookup("::ffff:173.185.182.82");
		test.notEqual(before6, null);

		//clear data;
		geoip.clear();

		//make sure data is cleared
		var none4 = geoip.lookup("75.82.117.180");
		test.equal(none4, null);
		var none6 = geoip.lookup("::ffff:173.185.182.82");
		test.equal(none6, null);

		//reload data asynchronously
		geoip.reloadData(function(){
			//make sure we have value from before
			var after4 = geoip.lookup("75.82.117.180");
			test.deepEqual(before4, after4);
			var after6 = geoip.lookup("::ffff:173.185.182.82");
			test.deepEqual(before6, after6);

			test.done(); 
		});
	},

	testUnassigned: function (test) {
		test.expect(8);

		var ip = '1.1.1.1';

		var actual = geoip.lookup(ip);

		test.notStrictEqual(actual.range, undefined, 'should contain IPv4 range');

		test.strictEqual(actual.country, '', "should match empty country");

		test.strictEqual(actual.region, '', "should match empty region");

		test.strictEqual(actual.eu, '', "should match empty eu");

		test.strictEqual(actual.timezone, '', "should match empty timezone");

		test.strictEqual(actual.city, '', "should match empty city");

		test.strictEqual(actual.ll[0], null, 'should contain empty coordinates');
		test.strictEqual(actual.ll[1], null, 'should contain empty coordinates');

		test.done();
	}
};
