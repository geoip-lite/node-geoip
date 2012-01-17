var fs = require('fs');

var ifile = process.argv[2];
var ofile = process.argv[3];

if(!ifile || !ofile) {
	console.warn("No input/output file");
	process.exit();
}

// First we have to define writeUInt32 correctly based on the node version in use
// Our fault for using unstable APIs
var writeUInt32;
if(process.version.match(/^v0\.4\./)) {
	writeUInt32 = function(b, value, offset, bigEndian) {
		if(bigEndian) {
			b[offset+0] = (value >> 24) & 0xff;
			b[offset+1] = (value >> 16) & 0xff;
			b[offset+2] = (value >>  8) & 0xff;
			b[offset+3] = (value >>> 0) & 0xff;
		}
		else {
			b[offset+3] = (value >> 24) & 0xff;
			b[offset+2] = (value >> 16) & 0xff;
			b[offset+1] = (value >>  8) & 0xff;
			b[offset+0] = (value >>> 0) & 0xff;
		}
		return true;
	};
}
else if(process.version == 'v0.5.3') {
	writeUInt32 = function(b, value, offset, bigEndian) {
		return b.writeUInt32(value, offset, bigEndian?"big":"little");
	};
}
else if(process.version == 'v0.5.4') {
	writeUInt32 = function(b, value, offset, bigEndian) {
		return b.writeUInt32(value, offset, bigEndian);
	};
}
else if((new Buffer(0).writeUInt32BE)) {
	writeUInt32 = function(b, value, offset, bigEndian) {
		if(bigEndian)
			return b.writeUInt32BE(value, offset);
		else
			return b.writeUInt32LE(value, offset);
	};
}

var lastline = "";

function process_line(line, i, a) {
	var fields = line.split(/, */);
	if(fields.length < 6) {
		console.log("weird line: %s::", line);
		return;
	}
	var sip, eip, cc, b, bsz, i;
	cc  = fields[4].replace(/"/g, '');

	if(fields[0].match(/:/)) {
		// IPv6
		bsz = 34;
		sip = aton6(fields[0]);
		eip = aton6(fields[1]);

		b = new Buffer(bsz);
		for(i=0; i<sip.length; i++)
			writeUInt32(b, sip[i], i*4, true);
		for(i=0; i<eip.length; i++)
			writeUInt32(b, eip[i], 16+i*4, true);
	}
	else {
		// IPv4
		bsz = 10;

		sip = parseInt(fields[2].replace(/"/g, ''), 10);
		eip = parseInt(fields[3].replace(/"/g, ''), 10);

		b = new Buffer(bsz);
		b.fill(0);
		writeUInt32(b, sip, 0, true);
		writeUInt32(b, eip, 4, true);
	}

	b.write(cc, bsz-2);

	fs.writeSync(ofd, b, 0, bsz, null);
}

function aton6(ip) {
	var l, i;
	ip = ip.replace(/"/g, '').split(/:/);
	l = ip.length-1;
	if(ip[l] === "")
		ip[l] = 0;
	if(l < 7) {
		ip.length=8;
		for(i=l; i>=0 && ip[i] !== ""; i--) {
			ip[7-l+i] = ip[i];
		}
	}
	for(i=0; i<8; i++) {
		if(!ip[i])
			ip[i]=0;
		else
			ip[i] = parseInt(ip[i], 16);
	}

	var r = [];
	for(i=0; i<4; i++) {
		r.push(((ip[2*i]<<16)+ip[2*i+1])>>>0);
	}

	return r;
}

function process_input(data) {
	var lines = data.split(/[\r\n]+/);
	lines[0] = lastline + lines[0];
	lastline = lines.pop();

	lines.forEach(process_line);

	//console.log("wrote %d lines", lines.length);
}

var ofd = fs.openSync(ofile, "w");
var istream = fs.createReadStream(ifile);
istream.setEncoding('utf8');
istream.on('data', process_input);




