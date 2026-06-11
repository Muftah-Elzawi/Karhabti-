module.exports = {
  root: true,
  extends: [require.resolve('@karhabti/config/eslint/base.cjs')],
  rules: {
    // NestJS DI relies on emitDecoratorMetadata: classes injected via
    // constructor params must be VALUE imports, or their metadata is erased.
    '@typescript-eslint/consistent-type-imports': 'off',
  },
};
