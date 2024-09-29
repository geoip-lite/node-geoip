const geoIp2 = require('../lib/main.js');
const addr = geoIp2.pretty(34525252);

console.log(`version: ${geoIp2.version}\npretty: ${addr}`);