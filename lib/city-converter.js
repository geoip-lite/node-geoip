var fs = require('fs');

var lfile = process.argv[2];
var ifile = process.argv[3];
var ofile = process.argv[4];

if(!lfile || !ifile || !ofile) {
	console.warn("No input/output file");
	process.exit();
}

var lastline = {'location': "", 'block': ""};
var process_data = {};

var locations = [];

process_data['block'] = function(line, i, a) {
	if(line.match(/^Copyright/) || !line.match(/\d/)) {
		return;
	}
	var fields = line.replace(/"/g, '').split(/, */);
	var sip, eip, locId, b, bsz, vsz=24, i=0;

	// IPv4
	bsz = 8;

	sip = parseInt(fields[0], 10);
	eip = parseInt(fields[1], 10);
	locId = parseInt(fields[2], 10);

	b = new Buffer(bsz+vsz);
	b.fill(0);
	b.writeUInt32BE(sip>>>0, 0);
	b.writeUInt32BE(eip>>>0, 4);

	if(locations[locId]) {
		if(typeof locations[locId]['cc'] != 'string' || typeof locations[locId]['rg'] != 'string' || typeof locations[locId]['city'] != 'string')
			console.log(locId, locations[locId]);
		i += b.write(locations[locId]['cc'],   bsz+i);
		i += b.write(locations[locId]['rg'],   bsz+i);
		i += b.write(locations[locId]['city'], bsz+i);

		fs.writeSync(ofd, b, 0, b.length, null);
	}
};

process_data['location'] = function(line, i, a) {
	if(line.match(/^Copyright/) || !line.match(/\d/)) {
		return;
	}
	var fields = line.replace(/"/g, '').split(/, */);
	var locId;
	locId = parseInt(fields[0], 10);

	locations[locId] = {cc: fields[1], rg: fields[2], city: fields[3]};
};

function process_input(which, data) {
	var lines = data.split(/[\r\n]+/);
	lines[0] = lastline[which] + lines[0];
	lastline[which] = lines.pop();

	lines.forEach(process_data[which]);

	//console.log("wrote %d lines", lines.length);
}

var ofd = fs.openSync(ofile, "w");
var lstream = fs.createReadStream(lfile);
lstream.setEncoding('utf8');
lstream.on('data', function(data) { process_input('location', data); });
lstream.on('end', function() {

	var istream = fs.createReadStream(ifile);
	istream.setEncoding('utf8');
	istream.on('data', function(data) { process_input('block', data); });
});



