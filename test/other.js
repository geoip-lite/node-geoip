const geoIp2 = require('../index.js');

const ip = 34525252;
const addr = geoIp2.pretty(ip);

console.log(`Module version: ${geoIp2.version}\nIP: ${34525252}\nPretty: ${addr}`);