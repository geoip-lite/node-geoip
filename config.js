// Geoip data updates configuration
//
module.exports = {
	intermediateServer: { // Geoip intermediate server configuration for both scripts geoip-server and getdb
		port: 80,
		host: '127.0.0.1'
	},
	spreadLoad: { // Spread access to MaxMind database and intermediate server (if used one)
		toMaxMindServer:      2 * 60 * 60 * 1000, //  2 hours after 00:00 of first Wednesday of month (MaxMind updates first Tuesday of each month)
		gapAfterMaxMind:          10 * 60 * 1000, // 10 minutes after update from MaxMind server
		toIntermediateServer: 2 * 60 * 60 * 1000  //  2 hours after gap
	}
}