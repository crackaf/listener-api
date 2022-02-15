module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ['google'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    // eslint-disable-next-line prettier/prettier
    // eslint-disable-next-line quote-props
    indent: ['error', 2],
    'prettier/prettier': 'error',
    'require-jsdoc': 'warn',
    'no-unused-vars': 'warn',
  },
};
