const geoIp2 = require('../lib/main.js');

const ipv4 = geoIp2.lookup('109.199.64.0');
const ipv6 = geoIp2.lookup('2001:470:1:c84::111');

console.log(ipv4);
console.log(ipv6);