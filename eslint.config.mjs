import js from '@eslint/js';
import globals from 'globals';

// noinspection JSUnusedGlobalSymbols
export default [
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 2024,
			globals: {
				...globals.node,
				...globals.es2021,
			}
		},
		rules: {
			'arrow-spacing': ['warn', { before: true, after: true }],
			'comma-dangle': ['error'],
			'comma-spacing': 'error',
			'comma-style': 'error',
			'curly': ['error', 'multi-line', 'consistent'],
			'dot-location': ['error', 'property'],
			'handle-callback-err': 'off',
			'indent': ['warn', 'tab'],
			'keyword-spacing': 'warn',
			'max-nested-callbacks': ['error', { max: 4 }],
			'max-statements-per-line': ['error', { max: 2 }],
			'no-console': 'off',
			'no-empty': 'warn',
			'no-empty-function': 'error',
			'no-floating-decimal': 'error',
			'no-lonely-if': 'error',
			'no-multi-spaces': 'warn',
			'no-multiple-empty-lines': ['warn', { max: 4, maxEOF: 1, maxBOF: 0 }],
			'no-shadow': ['error', { allow: ['err', 'resolve', 'reject'] }],
			'no-trailing-spaces': ['warn'],
			'no-unreachable': 'warn',
			'no-unused-vars': 'warn',
			'no-use-before-define': ['error', { functions: false, classes: true }],
			'no-var': 'error',
			'object-curly-spacing': ['error', 'always'],
			'prefer-const': 'error',
			'quotes': ['warn', 'single'],
			'semi': ['warn', 'always'],
			'sort-vars': 'warn',
			'space-before-blocks': 'error',
			'space-before-function-paren': ['error', { anonymous: 'never', named: 'never', asyncArrow: 'always' }],
			'space-in-parens': 'error',
			'space-infix-ops': 'error',
			'space-unary-ops': 'error',
			'spaced-comment': 'warn',
			'wrap-regex': 'error',
			'yoda': 'error'
		},
		ignores: ['node_modules', 'lib/*', 'test/*', 'utils/*']
	}
];