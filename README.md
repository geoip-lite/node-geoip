GeoIP-lite
==========

A native NodeJS API for the GeoLite data from MaxMind.

This product includes GeoLite data created by MaxMind, available from http://maxmind.com/

introduction
------------

MaxMind provides a set of data files for IP to Geo mapping along with opensource libraries to parse and lookup these data files.
One would typically write a wrapper around their C API to get access to this data in other languages (like JavaScript).

GeoIP-lite instead attempts to be a fully native JavaScript library.  A converter script converts the CSV files from MaxMind into
an internal binary format (note that this is different from the binary data format provided by MaxMind).  The geoip module uses this
binary file to lookup IP addresses and return the country that it maps to.

Both IPv4 and IPv6 addresses are supported.  The library does not support the GeoLite city database at this time or the commercial
database from MaxMind.

philosophy
----------

I was really aiming for a fast JavaScript native implementation for geomapping of IPs.  My prime motivator was the fact that it was
really hard to get libgeoip built for Mac OSX without using the library from MacPorts.

why geoip-lite
--------------

So why are we called geoip-lite?  `npm` already has a [geoip package](http://search.npmjs.org/#/geoip) which provides a JavaScript
binding around libgeoip from MaxMind.  The `geoip` package is fully featured and supports everything that the MaxMind APIs support,
however, it requires `libgeoip` to be installed on your system.

`geoip-lite` on the other hand is a fully JavaScript implementation.  It is not as fully featured as `geoip`, most particularly, it
only maps IP addresses to countries, however, by reducing its scope, it is about 40% faster at doing lookups.  On average, an IP to
Country lookup should take 20 microseconds on a simple Macbook Pro.  IPv4 addresses take about 6 microseconds, while IPv6 addresses
take about 30 microseconds.

synopsis
--------

    var geoip = require('geoip-lite');
    
    var ip = "207.97.227.239";
    var geo = geoip.lookup(ip);

    console.log(geo.country);
    // US

installation
------------

    $ npm install geoip-lite


API
---

geoip-lite is completely synchronous.  There are no callbacks involved.  All blocking file IO is done at
startup time, so all runtime calls are executed in-memory and are fast.

### Looking up an IP address ###

If you have an IP address in dotted quad notation, IPv6 colon notation, or a 32 bit unsigned integer (treated
as an IPv4 address), pass it to the `lookup` method.  Note that you should remove any `[` and `]` around an
IPv6 address before passing it to this method.

    var geo = geoip.lookup(ip);

If the IP address was found, the `lookup` method returns an object with the following structure:

    {
       range: [ <low bound of IP block>, <high bound of IP block> ],
       country: 'XX'    // 2 letter ISO-3166-2 country code
    }

The actual values for the `range` array depend on whether the IP is IPv4 or IPv6 and should be
considered internal to `geoip-lite`.  To get a human readable format, pass them to `geoip.pretty()`

If the IP address was not found, the `lookup` returns `null`

### Pretty printing an IP address ###

If you have a 32 bit unsigned integer, or a number returned as part of the `range` array from the `lookup` method,
the `pretty` method can be used to turn it into a human readable string.

    console.log("The IP is %s", geoip.pretty(ip));

This method returns a string if the input was in a format that `geoip-lite` can recognise, else it returns the
input itself.

Copyright
---------

`geoip-lite` is Copyright 2011 Philip Tellis <philip@bluesmoon.info> and the latest version of the code is
available at https://github.com/bluesmoon/node-geoip

License
-------

There are two licenses for the code and data.  See the LICENSE file for details.
