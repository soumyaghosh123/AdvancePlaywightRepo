import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

const noSleeps = [
  'error',
  {
    selector: "CallExpression[callee.property.name='waitForTimeout']",
    message: 'Fixed sleeps are banned. Use auto-wait, expect.poll or WaitUtils.',
  },
  {
    selector: "NewExpression[callee.name='Promise'] CallExpression[callee.name='setTimeout']",
    message: 'Fixed sleeps are banned.',
  },
];

export default tseslint.config(
  { ignores: ['node_modules/', 'reports/', 'test-results/', '.features-gen/', '.superpowers/', 'generators/'] },
  ...tseslint.configs.recommended,
  { files: ['tests/**/*.ts'], ...playwright.configs['flat/recommended'] },
  { files: ['src/**/*.ts'], rules: { 'no-restricted-syntax': noSleeps } },
  // CommonJS files (plopfile.cjs) can only import with require().
  { files: ['**/*.cjs'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
);
