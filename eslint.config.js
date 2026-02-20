const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'commonjs',
			globals: {
				...globals.node,
			}
		},
		rules: {
			"indent": ["error", "tab"],
			"linebreak-style": "off",
			"no-console": "off",
			"no-constant-condition": "off",
			"no-control-regex": "off",
			"quotes": "off",
			"semi": ["error", "always"]
		}
	}
];
