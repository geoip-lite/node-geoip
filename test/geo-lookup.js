const assert = require('assert');
const t1 = +new Date();
const geoIp2 = require('../lib/main.js');
const t2 = +new Date();

if (process.argv.length > 2) {
	console.dir(geoIp2.lookup(process.argv[2]));
	const t3 = +new Date();
	console.log('Startup: %dms, exec: %dms', t2 - t1, t3 - t2);
	process.exit(1);
}

const f = [];
let ip;
const n = 30000;
const nf = [];
let r;
const ts = +new Date();

for (let i = 0; i < n; i++) {
	if ((i % 2) === 0) {
		ip = Math.round((Math.random() * 0xff000000) + 0xffffff);
	} else {
		ip = '2001:' +
			Math.round(Math.random() * 0xffff).toString(16) + ':' +
			Math.round(Math.random() * 0xffff).toString(16) + ':' +
			Math.round(Math.random() * 0xffff).toString(16) + ':' +
			Math.round(Math.random() * 0xffff).toString(16) + ':' +
			Math.round(Math.random() * 0xffff).toString(16) + ':' +
			Math.round(Math.random() * 0xffff).toString(16) + ':' +
			Math.round(Math.random() * 0xffff).toString(16) + '';
	}

	r = geoIp2.lookup(ip);
	if (r === null) {
		nf.push(ip);
		continue;
	}

	f.push([ip, r]);

	assert.ok(geoIp2.cmp(ip, r.range[0]) >= 0, 'Problem with ' + geoIp2.pretty(ip) + ' < ' + geoIp2.pretty(r.range[0]));
	assert.ok(geoIp2.cmp(ip, r.range[1]) <= 0, 'Problem with ' + geoIp2.pretty(ip) + ' > ' + geoIp2.pretty(r.range[1]));
}

const te = +new Date();


// f.forEach(data => {
// 	console.log('%s bw %s & %s is %s', geoIp2.pretty(data[0]), geoIp2.pretty(data[1].range[0]), geoIp2.pretty(data[1].range[1]), data[1].country);
// });


console.log('Found %d (%d/%d) ips in %dms (%s ip/s) (%sμs/ip)', n, f.length, nf.length, te - ts, (n * 1000 / (te - ts)).toFixed(3), ((te - ts) * 1000 / n).toFixed(0));
console.log('Took %d ms to startup', t2 - t1);