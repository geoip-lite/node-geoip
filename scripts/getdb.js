var http = require('http'),
	path = require('path'),
	fs = require('fs'),
	async = require('async'),
	colors = require('colors');

var config = require('./config.js');

var dirModule = path.join(__dirname, '..'),
	dirData = path.join(dirModule, 'data');

var files = [
	'geoip-city-names.dat',
	'geoip-city.dat',
	'geoip-city6.dat',
	'geoip-country.dat',
	'geoip-country6.dat'
];

async.forEachSeries(files, function(fileName, callback) {
	var req = http.get('http://'+config.host+':'+config.port+'/'+fileName);
	req.on('response', function(res){
		var filePath = path.join(dirData, fileName);
		console.log('Loading file: '+fileName);
		var ws = fs.createWriteStream(filePath);
		res.pipe(ws);
		res.on('end', callback);
	});
}, function() {
	console.log('Successfully Updated Databases from intermediate server.'.green);
});