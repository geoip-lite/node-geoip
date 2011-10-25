var fs   = require('fs'),
    path = require('path'),
    net = require('net');

// First we have to define readUInt32 correctly based on the node version in use
// Our fault for using unstable APIs
var readUInt32;
if(process.version.match(/^v0\.4\./)) {
	readUInt32 = function(b, offset, bigEndian) {
		if(bigEndian) {
			return ((b[offset]<<24)+
				(b[offset+1]<<16)+
				(b[offset+2]<<8)+
				(b[offset+3]))>>>0;
		}
		else {
			return ((b[offset+3]<<24)+
				(b[offset+2]<<16)+
				(b[offset+1]<<8)+
				(b[offset]))>>>0;
		}
	};
}
else if(process.version == 'v0.5.3') {
	readUInt32 = function(b, offset, bigEndian) {
		return b.readUInt32(offset, bigEndian?"big":"little");
	};
}
else if(process.version == 'v0.5.4') {
	readUInt32 = function(b, offset, bigEndian) {
		return b.readUInt32(offset, bigEndian);
	};
}
else if((new Buffer(0).readUInt32BE)) {
	readUInt32 = function(b, offset, bigEndian) {
		if(bigEndian)
			return b.readUInt32BE(offset);
		else
			return b.readUInt32LE(offset);
	};
}

(function() {

var ifile = path.join(__dirname, '/../data/geoip-country.dat');
var ifd = fs.openSync(ifile, "r");
var sz = fs.fstatSync(ifd).size;

var buff = new Buffer(sz);
fs.readSync(ifd, buff, 0, sz, 0);
fs.closeSync(ifd);

var lastline = sz/10-1;
var lastip = readUInt32(buff, lastline*10+4, true);
var firstip = readUInt32(buff, 0, true);

lookup4 = function(ip) {
	var fline=0, floor=lastip, cline=lastline, ceil=firstip, line;

	if(ip > lastip || ip < firstip) {
		return null;
	}

	do {
		line = Math.round((cline-fline)/2)+fline;
		floor = readUInt32(buff, line*10, true);
		ceil  = readUInt32(buff, line*10+4, true);

		if(floor <= ip && ceil >= ip) {
			var cc = buff.toString('utf8', line*10+8, line*10+10);
			return { range: [floor, ceil], country: cc };
		}
		else if(fline == cline) {
			return null;
		}
		else if(fline == cline-1) {
			if(line == fline)
				fline = cline;
			else
				cline = fline;
		}
		else if(floor > ip) {
			cline = line;
		}
		else if(ceil < ip) {
			fline = line;
		}
	} while(1);
}

})();

function aton4(a) {
	a = a.split(/\./);
	return ((parseInt(a[0], 10)<<24)>>>0) + ((parseInt(a[1], 10)<<16)>>>0) + ((parseInt(a[2], 10)<<8)>>>0) + (parseInt(a[3], 10)>>>0);
}

function ntoa4(n) {
	n = "" + (n>>>24&0xff) + "." + (n>>>16&0xff) + "." + (n>>>8&0xff) + "." + (n&0xff);
	return n;
}

(function() {
	
	var ifile = path.join(__dirname, '/../data/geoip-country6.dat');
	var ifd = fs.openSync(ifile, "r");
	var sz = fs.fstatSync(ifd).size;
	
	var buff = new Buffer(sz);
	fs.readSync(ifd, buff, 0, sz, 0);
	fs.closeSync(ifd);
	
	var lastline = sz/34-1;
	// XXX We only use the first 8 bytes of an IPv6 address
	// This identifies the network, but not the host within
	// the network.  Unless at some point of time we have a
	// global peace treaty and single subnets span multiple
	// countries, this should not be a problem.
	function readip(line, offset) {
		var ii=0, ip=[];
		for(ii=0; ii<2; ii++)
			ip.push(readUInt32(buff, line*34+offset*16+ii*4, true));
		return ip;
	}
	
	var lastip=readip(lastline, 1), firstip=readip(0, 0);
	
	lookup6 = function(ip) {
		var fline=0, floor=lastip, cline=lastline, ceil=firstip, line;

		if(cmp6(ip, lastip) > 0 || cmp6(ip, firstip) < 0) {
			return null;
		}
	
		do {
			line = Math.round((cline-fline)/2)+fline;
			floor = readip(line, 0);
			ceil  = readip(line, 1);
	
			if(cmp6(floor, ip) <= 0 && cmp6(ceil, ip) >= 0) {
				var cc = buff.toString('utf8', line*34+32, line*34+34);
				return { range: [floor, ceil], country: cc };
			}
			else if(fline == cline) {
				return null;
			}
			else if(fline == cline-1) {
				if(line == fline)
					fline = cline;
				else
					cline = fline;
			}
			else if(cmp6(floor, ip) > 0) {
				cline = line;
			}
			else if(cmp6(ceil, ip) < 0) {
				fline = line;
			}
		} while(1);
	};
	
})();

//lookup4 = gen_lookup('geoip-country.dat', 4);
//lookup6 = gen_lookup('geoip-country6.dat', 16);

function cmp6(a, b) {
	for(var ii=0; ii<2; ii++) {
		if(a[ii] < b[ii]) return -1;
		if(a[ii] > b[ii]) return 1;
	}
	return 0;
}

function aton6(a) {
	var l, i;
	a = a.replace(/"/g, '').split(/:/);
	l = a.length-1;
	if(a[l] === "")
		a[l] = 0;
	if(l < 7) {
		a.length=8;
		for(i=l; i>=0 && a[i] !== ""; i--) {
			a[7-l+i] = a[i];
		}
	}
	for(i=0; i<8; i++) {
		if(!a[i])
			a[i]=0;
		else
			a[i] = parseInt(a[i], 16);
	}

	var r = [];
	for(i=0; i<4; i++) {
		r.push(((a[2*i]<<16)+a[2*i+1])>>>0);
	}

	return r;
}

function ntoa6(n) {
	var a = "[";
	for(var i=0; i<n.length; i++) {
		a+=(n[i]>>>16).toString(16) + ":";
		a+=(n[i]&0xffff).toString(16) + ":";
	}
	a=a.replace(/:$/, ']').replace(/:0+/g, ':').replace(/::+/, '::');

	return a;
}


exports.lookup = function(ip) {
	if(typeof ip == 'number')
		return lookup4(ip);
	if(net.isIP(ip) === 4)
		return lookup4(aton4(ip));
	if(net.isIP(ip) === 6)
		return lookup6(aton6(ip));
	return null;
};

exports.pretty = function(n) {
	if(typeof n == 'string')
		return n;
	if(typeof n == 'number')
		return ntoa4(n);
	if(n instanceof Array)
		return ntoa6(n);

	return n;
}

exports.cmp = function(a, b) {
	if(typeof a == 'number' && typeof b == 'number')
		return (a<b?-1:(a>b?1:0));
	if(a instanceof Array && b instanceof Array)
		return cmp6(a, b);
	return null;
}

