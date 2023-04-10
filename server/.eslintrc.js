/**
  * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
  * © Copyright Utrecht University (Department of Information and Computing Sciences)
  *
  * This source code is licensed under the MIT license found in the
  * LICENSE file in the root directory of this source tree.
  */

module.exports = {
    "env": {
        "es6": true,
        "node": true,
    },
    "parser": "@typescript-eslint/parser",
    "extends": [
        "plugin:@typescript-eslint/recommended",
        "plugin:import/typescript",
    ],
    "plugins": ["@typescript-eslint"],

    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module",
    },

    "rules": {
        "max-len": ["warn", { "code": 120 }],
        "comma-dangle": ["error", "always-multiline"],
        "@typescript-eslint/semi": ["error"],
        "object-curly-spacing": ["error", "always"],
        "eol-last": ["error", "always"],
        "lines-between-class-members": ["error", "always", { "exceptAfterSingleLine": true }],
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/no-parameter-properties": "off",
        "@typescript-eslint/no-use-before-define": "off",
        "max-classes-per-file": "error",
        "prefer-template": "error",
        "@typescript-eslint/camelcase": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": "off",
    },
};