module.exports = {
    "env": {
        "node": true,
        "es6": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 2018
    },
    "rules": {
        "indent": [
            "error",
            "tab"
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "no-console": "off",
        "no-constant-condition": "off",
        "no-control-regex": "off",
        "quotes": "off",
        "semi": [
            "error",
            "always"
        ]
    }
};