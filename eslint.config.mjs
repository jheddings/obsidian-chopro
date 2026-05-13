import typescriptParser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

// Disable all obsidianmd rules for non-TS files.  Several rules in the
// plugin's recommended config call getParserServices() but are applied
// globally (no files filter), which crashes on package.json and other
// non-TypeScript files that lack type information.
const obsidianmdOff = Object.fromEntries(
    Object.keys(obsidianmd.rules ?? {}).map((name) => [`obsidianmd/${name}`, "off"])
);

export default defineConfig([
    {
        ignores: ["main.js", "dist/**", "node_modules/**", "*.d.ts", "*.mjs"],
    },
    ...obsidianmd.configs.recommended,
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: typescriptParser,
            globals: globals.browser,
            parserOptions: {
                project: "./tsconfig.json",
            },
        },
        rules: {
            curly: ["error", "all"],
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
            "@typescript-eslint/no-explicit-any": "warn",
        },
    },
    {
        files: ["test/**/*.ts", "test/**/*.tsx", "vitest.config.ts"],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
        rules: {
            ...obsidianmdOff,
            "import/no-nodejs-modules": "off",
            "@typescript-eslint/no-require-imports": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
        },
    },
    {
        files: ["package.json"],
        rules: {
            ...obsidianmdOff,
            "depend/ban-dependencies": "off",
        },
    },
]);
