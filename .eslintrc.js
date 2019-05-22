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
    'react-native/no-raw-text': 'off',
    'react/prop-types': [
      'warn',
      {
        skipUndeclared: true
      }
    ],
    'react/require-default-props': 'off',
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
    'jsx-quotes': [
      'error',
      'prefer-single'
    ],
    'standard/array-bracket-even-spacing': 'off',
    'standard/computed-property-even-spacing': 'off',
    'standard/object-curly-even-spacing': 'off',
    'import/prefer-default-export': 'off',
    'import/namespace': 'error',
    'no-console': 'off',
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
