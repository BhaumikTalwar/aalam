import jsdoc from "eslint-plugin-jsdoc";
import eslint from "@eslint/js";

const config = [
    eslint.configs.recommended,
    jsdoc.configs["flat/recommended"],
    {
        files: ["**/*.js"],
        ignores: ["node_modules/**", "dist/**", "*.min.js"],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: "module",
        },
        plugins: {
            jsdoc,
        },
        rules: {
            "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
            "no-console": "error",
            "no-debugger": "error",
            "eqeqeq": ["error", "always", { null: "ignore" }],
            "curly": ["error", "multi-line"],
            "brace-style": ["error", "1tbs", { allowSingleLine: true }],
            "no-var": "error",
            "prefer-const": "error",
            "prefer-template": "error",
            "no-multi-spaces": "error",
            "semi": ["error", "always"],
            "quotes": ["error", "double", { avoidEscape: true }],
            "comma-dangle": ["error", "always-multiline"],
            "no-trailing-spaces": "error",
            "eol-last": "error",
            "indent": ["error", 4],
            "no-multiple-empty-lines": ["error", { max: 3, maxEOF: 0 }],

            "jsdoc/require-jsdoc": [
                "error",
                {
                    require: {
                        FunctionDeclaration: true,
                        MethodDefinition: true,
                        ClassDeclaration: true,
                        ClassExpression: true,
                        ArrowFunctionExpression: false,
                        FunctionExpression: true,
                    },
                    contexts: ["any"],
                },
            ],
            "jsdoc/require-description": "warn",
            "jsdoc/require-param": "error",
            "jsdoc/require-returns": "error",
            "jsdoc/require-param-type": "error",
            "jsdoc/require-returns-type": "error",
            "jsdoc/require-example": "off",
            "jsdoc/check-types": "error",
            "jsdoc/check-param-names": "error",
            "jsdoc/check-tag-names": ["error", { definedTags: ["private", "internal"] }],
            "jsdoc/check-access": "error",
            "jsdoc/require-property-description": "error",
            "jsdoc/require-throws": "error",
            "jsdoc/no-undefined-types": "error",
            "jsdoc/valid-types": "error",
        },
    },
];

export default config;
