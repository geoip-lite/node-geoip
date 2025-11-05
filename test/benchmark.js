const geoIp2 = require('../dist/main.js');

console.log('===== GeoIP2 Performance Benchmark =====\n');

// Benchmark 1: IPv4 Lookup Speed
console.log('1. IPv4 Lookup Speed Test');
const ipv4TestIP = '8.8.8.8';
const ipv4Iterations = 100000;
const ipv4Start = Date.now();

for (let i = 0; i < ipv4Iterations; i++) {
	geoIp2.lookup(ipv4TestIP);
}

const ipv4Duration = Date.now() - ipv4Start;
const ipv4PerLookup = (ipv4Duration / ipv4Iterations).toFixed(4);
const ipv4Throughput = Math.round(ipv4Iterations / (ipv4Duration / 1000));

console.log(`  Iterations: ${ipv4Iterations.toLocaleString()}`);
console.log(`  Total time: ${ipv4Duration}ms`);
console.log(`  Per lookup: ${ipv4PerLookup}ms`);
console.log(`  Throughput: ${ipv4Throughput.toLocaleString()} lookups/sec`);
console.log();

// Benchmark 2: IPv6 Lookup Speed
console.log('2. IPv6 Lookup Speed Test');
const ipv6TestIP = '2001:4860:4860::8888';
const ipv6Iterations = 100000;
const ipv6Start = Date.now();

for (let i = 0; i < ipv6Iterations; i++) {
	geoIp2.lookup(ipv6TestIP);
}

const ipv6Duration = Date.now() - ipv6Start;
const ipv6PerLookup = (ipv6Duration / ipv6Iterations).toFixed(4);
const ipv6Throughput = Math.round(ipv6Iterations / (ipv6Duration / 1000));

console.log(`  Iterations: ${ipv6Iterations.toLocaleString()}`);
console.log(`  Total time: ${ipv6Duration}ms`);
console.log(`  Per lookup: ${ipv6PerLookup}ms`);
console.log(`  Throughput: ${ipv6Throughput.toLocaleString()} lookups/sec`);
console.log();

// Benchmark 3: Mixed IP Types
console.log('3. Mixed IPv4/IPv6 Lookup Test');
const mixedIPs = [
	'8.8.8.8',
	'1.1.1.1',
	'2001:4860:4860::8888',
	'72.229.28.185',
	'2606:4700:4700::1111',
	'104.113.255.255',
	'2a01:118f:30a:3900:c954:e6ef:8067:d4e8',
	'210.138.184.59',
];

const mixedIterations = 50000;
const mixedStart = Date.now();

for (let i = 0; i < mixedIterations; i++) {
	const ip = mixedIPs[i % mixedIPs.length];
	geoIp2.lookup(ip);
}

const mixedDuration = Date.now() - mixedStart;
const mixedPerLookup = (mixedDuration / mixedIterations).toFixed(4);
const mixedThroughput = Math.round(mixedIterations / (mixedDuration / 1000));

console.log(`  Iterations: ${mixedIterations.toLocaleString()}`);
console.log(`  Total time: ${mixedDuration}ms`);
console.log(`  Per lookup: ${mixedPerLookup}ms`);
console.log(`  Throughput: ${mixedThroughput.toLocaleString()} lookups/sec`);
console.log();

// Benchmark 4: Private IP Detection (early return)
console.log('4. Private IP Detection Speed (Early Return)');
const privateIPs = [
	'192.168.1.1',
	'10.0.0.1',
	'172.16.0.1',
	'127.0.0.1',
];

const privateIterations = 100000;
const privateStart = Date.now();

for (let i = 0; i < privateIterations; i++) {
	const ip = privateIPs[i % privateIPs.length];
	geoIp2.lookup(ip);
}

const privateDuration = Date.now() - privateStart;
const privatePerLookup = (privateDuration / privateIterations).toFixed(4);
const privateThroughput = Math.round(privateIterations / (privateDuration / 1000));

console.log(`  Iterations: ${privateIterations.toLocaleString()}`);
console.log(`  Total time: ${privateDuration}ms`);
console.log(`  Per lookup: ${privatePerLookup}ms`);
console.log(`  Throughput: ${privateThroughput.toLocaleString()} lookups/sec`);
console.log();

// Benchmark 5: Invalid IP Handling
console.log('5. Invalid IP Handling Speed');
const invalidInputs = [null, undefined, '', 'invalid', -1];
const invalidIterations = 100000;
const invalidStart = Date.now();

for (let i = 0; i < invalidIterations; i++) {
	const input = invalidInputs[i % invalidInputs.length];
	geoIp2.lookup(input);
}

const invalidDuration = Date.now() - invalidStart;
const invalidPerLookup = (invalidDuration / invalidIterations).toFixed(4);
const invalidThroughput = Math.round(invalidIterations / (invalidDuration / 1000));

console.log(`  Iterations: ${invalidIterations.toLocaleString()}`);
console.log(`  Total time: ${invalidDuration}ms`);
console.log(`  Per lookup: ${invalidPerLookup}ms`);
console.log(`  Throughput: ${invalidThroughput.toLocaleString()} lookups/sec`);
console.log();

// Summary
console.log('===== Performance Summary =====');
console.log(`IPv4 Throughput:     ${ipv4Throughput.toLocaleString()} ops/sec`);
console.log(`IPv6 Throughput:     ${ipv6Throughput.toLocaleString()} ops/sec`);
console.log(`Mixed Throughput:    ${mixedThroughput.toLocaleString()} ops/sec`);
console.log(`Private IP Detect:   ${privateThroughput.toLocaleString()} ops/sec`);
console.log(`Invalid Input:       ${invalidThroughput.toLocaleString()} ops/sec`);
console.log();

// Memory usage
const memUsage = process.memoryUsage();
console.log('===== Memory Usage =====');
console.log(`RSS:          ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
console.log(`Heap Total:   ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
console.log(`Heap Used:    ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`External:     ${(memUsage.external / 1024 / 1024).toFixed(2)} MB`);
