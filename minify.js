const fs = require('node:fs');
const path = require('node:path');
const terser = require('terser');

const minifyJSFiles = async (sourceDirectory, outputDirectory) => {
	if (!fs.existsSync(sourceDirectory)) throw new Error(`Source directory does not exist: ${sourceDirectory}`);
	if (fs.existsSync(outputDirectory)) fs.rmSync(outputDirectory, { recursive: true });
	fs.mkdirSync(outputDirectory, { recursive: true });

	const files = fs.readdirSync(sourceDirectory).filter(file => file.endsWith('.js'));

	for (const file of files) {
		const inputFilePath = path.join(sourceDirectory, file);
		const outputFilePath = path.join(outputDirectory, file);

		try {
			const code = fs.readFileSync(inputFilePath, 'utf8');
			const result = await terser.minify(code, {
				mangle: true,
				ecma: 2024,
				compress: true,
				format: { quote_style: 1 },
				toplevel: true
			});

			if (result.error) throw new Error(result.error);

			fs.writeFileSync(outputFilePath, result.code, 'utf8');
			console.log(`Minimized: ${file}`);
		} catch (err) {
			console.error(`Error processing ${file}: ${err.message}`);
		}
	}

	console.log(`Minimization of JavaScript files in ${sourceDirectory} completed`);
};

(async () => {
	await minifyJSFiles('./lib', './lib-minified');
	await minifyJSFiles('./utils', './utils-minified');
})();
