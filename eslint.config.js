const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const typescriptParser = require("@typescript-eslint/parser");

module.exports = [
    {
        // ignore generated and build files
        ignores: ["main.js", "dist/**", "node_modules/**", "*.d.ts"],
    },
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: typescriptParser,
            ecmaVersion: 2021,
            sourceType: "module",
            parserOptions: {
                project: "./tsconfig.json",
            },
        },
        plugins: {
            "@typescript-eslint": typescriptEslint,
        },
        rules: {
            semi: "off",
            "@typescript-eslint/member-delimiter-style": "off",
            "@typescript-eslint/quotes": "off",
            "@typescript-eslint/indent": "off",
            "@typescript-eslint/comma-dangle": "off",
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/no-explicit-any": "warn",
        },
    },
    {
        files: ["**/*.js", "**/*.jsx"],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: "module",
        },
        rules: {
            semi: "off",
        },
    },
];
