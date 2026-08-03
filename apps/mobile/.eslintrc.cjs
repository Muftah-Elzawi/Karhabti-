module.exports = {
  root: true,
  extends: [require.resolve('@karhabti/config/eslint/frontend.cjs')],
  ignorePatterns: ['.expo/', 'dist/', 'android/', 'ios/', 'assets/'],
};
