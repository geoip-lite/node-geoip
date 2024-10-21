const geoIp2 = require('../lib/main.js');

const ip = 34525252;
const addr = geoIp2.pretty(ip);

console.log(`Module version: ${geoIp2.version}\nIP: ${34525252}\nPretty: ${addr}`);