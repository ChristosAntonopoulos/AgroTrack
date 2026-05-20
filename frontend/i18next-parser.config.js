module.exports = {
  contextSeparator: '_',
  createOldCatalogs: false,
  defaultNamespace: 'common',
  indentation: 2,
  keepRemoved: false,
  keySeparator: '.',
  lexers: {
    ts: ['JavascriptLexer'],
    tsx: ['JsxLexer'],
  },
  locales: ['en', 'el', 'it'],
  namespaceSeparator: ':',
  output: 'src/locales/$LOCALE/$NAMESPACE.json',
  sort: true,
  useKeysAsDefaultValue: false,
};
