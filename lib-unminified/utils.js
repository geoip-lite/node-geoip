const utils = module.exports = {};

utils.aton4 = a => {
	a = a.split(/\./);
	return ((parseInt(a[0], 10) << 24) >>> 0) + ((parseInt(a[1], 10) << 16) >>> 0) + ((parseInt(a[2], 10) << 8) >>> 0) + (parseInt(a[3], 10) >>> 0);
};

utils.aton6 = a => {
	a = a.replace(/"/g, '').split(/:/);

	const l = a.length - 1;
	let i;

	if (a[l] === '') {
		a[l] = 0;
	}

	if (l < 7) {
		a.length = 8;

		for (i = l; i >= 0 && a[i] !== ''; i--) {
			a[7 - l + i] = a[i];
		}
	}

	for (i = 0; i < 8; i++) {
		if (!a[i]) {
			a[i] = 0;
		} else {
			a[i] = parseInt(a[i], 16);
		}
	}

	const r = [];
	for (i = 0; i < 4; i++) {
		r.push(((a[2 * i] << 16) + a[2 * i + 1]) >>> 0);
	}

	return r;
};


utils.cmp = (a, b) => {
	if (typeof a === 'number' && typeof b === 'number') return (a < b ? -1 : (a > b ? 1 : 0));
	if (a instanceof Array && b instanceof Array) return this.cmp6(a, b);

	return null;
};

utils.cmp6 = (a, b) => {
	for (let ii = 0; ii < 2; ii++) {
		if (a[ii] < b[ii]) return -1;
		if (a[ii] > b[ii]) return 1;
	}

	return 0;
};

utils.isPrivateIP = addr => {
	addr = addr.toString();

	return addr.match(/^10\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/) != null ||
    addr.match(/^192\.168\.([0-9]{1,3})\.([0-9]{1,3})/) != null ||
    addr.match(/^172\.16\.([0-9]{1,3})\.([0-9]{1,3})/) != null ||
    addr.match(/^127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/) != null ||
    addr.match(/^169\.254\.([0-9]{1,3})\.([0-9]{1,3})/) != null ||
    addr.match(/^fc00:/) != null || addr.match(/^fe80:/) != null;
};

utils.ntoa4 = n => {
	n = n.toString();
	n = '' + (n >>> 24 & 0xff) + '.' + (n >>> 16 & 0xff) + '.' + (n >>> 8 & 0xff) + '.' + (n & 0xff);

	return n;
};

utils.ntoa6 = n => {
	let a = '[';

	for (let i = 0; i < n.length; i++) {
		a += (n[i] >>> 16).toString(16) + ':';
		a += (n[i] & 0xffff).toString(16) + ':';
	}

	a = a.replace(/:$/, ']').replace(/:0+/g, ':').replace(/::+/, '::');
	return a;
};