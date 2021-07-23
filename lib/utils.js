var utils = module.exports = {};

utils.aton4 = function(a) {
	a = a.split(/\./);
	return ((parseInt(a[0], 10)<<24)>>>0) + ((parseInt(a[1], 10)<<16)>>>0) + ((parseInt(a[2], 10)<<8)>>>0) + (parseInt(a[3], 10)>>>0);
};

utils.aton6 = function(ipv6) {
	const ipv6_hex = ipv6.replace(/"/g, '').replace(/^:|:$/g, '').split(":")
        let ipv6_int_full = []

        for (let i = 0; i < ipv6_hex.length; i ++) {
            const hex = ipv6_hex[i]
            if (hex != "") {
                ipv6_int_full.push(parseInt(hex, 16))
            } else {
                // normalize grouped zeros ::
                for (let j = ipv6_hex.length; j <= 8; j ++) {
                    ipv6_int_full.push(0);
                }
            }
        }

        let result = [];
        for (let i = 0; i<4; i++) {
            result.push((
                (ipv6_int_full[2*i]<<16) + ipv6_int_full[2*i+1]
            )>>>0);
        }

        return result;
};


utils.cmp = function(a, b) {
	if (typeof a === 'number' && typeof b === 'number') {
		return (a < b ? -1 : (a > b ? 1 : 0));
	}

	if (a instanceof Array && b instanceof Array) {
		return this.cmp6(a, b);
	}

	return null;
};

utils.cmp6 = function(a, b) {
	for (var ii = 0; ii < 2; ii++) {
		if (a[ii] < b[ii]) {
			return -1;
		}

		if (a[ii] > b[ii]) {
			return 1;
		}
	}

	return 0;
};

utils.isPrivateIP = function(addr) {
	addr = addr.toString();

	return addr.match(/^10\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/) != null ||
    addr.match(/^192\.168\.([0-9]{1,3})\.([0-9]{1,3})/) != null ||
    addr.match(/^172\.16\.([0-9]{1,3})\.([0-9]{1,3})/) != null ||
    addr.match(/^127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/) != null ||
    addr.match(/^169\.254\.([0-9]{1,3})\.([0-9]{1,3})/) != null ||
    addr.match(/^fc00:/) != null || addr.match(/^fe80:/) != null;
};

utils.ntoa4 = function(n) {
	n = n.toString();
	n = '' + (n>>>24&0xff) + '.' + (n>>>16&0xff) + '.' + (n>>>8&0xff) + '.' + (n&0xff);

	return n;
};

utils.ntoa6 = function(n) {
	var a = "[";

	for (var i = 0; i<n.length; i++) {
		a += (n[i]>>>16).toString(16) + ':';
		a += (n[i]&0xffff).toString(16) + ':';
	}

	a = a.replace(/:$/, ']').replace(/:0+/g, ':').replace(/::+/, '::');

	return a;
};
