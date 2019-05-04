module.exports = {
  parser: 'babel-eslint',
  extends: [
    'plugin:promise/recommended',
    'airbnb',
    'standard'
  ],
  plugins: [
    'react-hooks'
  ],
  env: {
    es6: true,
    browser: true,
    node: true
  },
  globals: {
    fetch: true
  },
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react/prop-types': [
      'warn',
      {
        skipUndeclared: true
      }
    ],
    'react/no-unescaped-entities': 'off',
    'react/jsx-filename-extension': [
      'warn',
      {
        extensions: [
          '.js',
          '.jsx'
        ]
      }
    ],
    'standard/array-bracket-even-spacing': 'off',
    'standard/computed-property-even-spacing': 'off',
    'standard/object-curly-even-spacing': 'off',
    'no-console': 'off',
    'jsx-quotes': [
      'error',
      'prefer-single'
    ],
    'sort-imports': [
      'warn',
      {
        ignoreDeclarationSort: true
      }
    ],
    'space-before-function-paren': [
      'error',
      'never'
    ]
  }
}
