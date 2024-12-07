const terser = require('terser');
const fs = require('node:fs/promises');
const path = require('node:path');

const minifyJSFiles = async (sourceDirectory, outputDirectory) => {
	try {
		await fs.access(sourceDirectory);
	} catch {
		throw new Error(`Source directory does not exist: ${sourceDirectory}`);
	}

	await fs.rm(outputDirectory, { recursive: true, force: true });
	await fs.mkdir(outputDirectory, { recursive: true });

	const files = (await fs.readdir(sourceDirectory)).filter(file => file.endsWith('.js'));
	for (const file of files) {
		try {
			const code = await fs.readFile(path.join(sourceDirectory, file), 'utf8');
			const result = await terser.minify(code, {
				mangle: true,
				ecma: 2024,
				module: true,
				compress: {
					passes: 3,
					pure_funcs: ['console.info', 'console.debug'],
					hoist_funs: false,
					hoist_vars: true,
					reduce_funcs: true,
					reduce_vars: true,
					unsafe: false,
					unused: true,
					dead_code: true
				},
				format: {
					quote_style: 3,
					preserve_annotations: true,
					comments: false
				},
				toplevel: true
			});

			await fs.writeFile(path.join(outputDirectory, file), result.code, 'utf8');
			console.log(`Minimized: ${file}`);
		} catch (err) {
			console.error(`Error processing ${file}: ${err.message}`);
		}
	}

	console.log(`Completed: ${sourceDirectory}`);
};

(async () => {
	await minifyJSFiles('./lib', './lib-minified');
	await minifyJSFiles('./utils', './utils-minified');
})();
