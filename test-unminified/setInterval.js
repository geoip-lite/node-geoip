const geoIp2 = require('../lib/main.js');
const ip = '86.63.89.41';

// Function
const action = async () => {
	const data = geoIp2.lookup(ip);
	console.log(data);
};

// Interval
setInterval(async () => {
	await action();
}, 2000);

// Run
(async () => await action())();