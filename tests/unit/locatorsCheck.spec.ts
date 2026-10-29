import { test, expect } from '@playwright/test';
import { checkLocators } from '../../scripts/locators-check';
import { tempRoot } from './helpers/tempRoot';

test('syntax errors name file and key', () => {
  const root = tempRoot('', { 'src/app/locators/login.properties': 'bad = By.foo("x")\nok = #ok\n' });
  const report = checkLocators(root);
  expect(report.errors).toHaveLength(1);
  expect(report.errors[0]).toMatch(/login\.properties: login\.bad: .*By\.foo/);
});

test('duplicate keys across files are an error', () => {
  const root = tempRoot('', {
    'src/app/locators/a.locators.json': '{"x":"#x"}',
    'src/app/locators/more/a.properties': 'x=#y\n',
  });
  expect(checkLocators(root).errors.join('\n')).toMatch(/Duplicate locator 'a\.x'/);
});

test('unreferenced keys are reported as unused; refs with args count as used', () => {
  const root = tempRoot('', {
    'src/app/locators/table.locators.json': '{"rowByName":"xpath=//tr[td=\'{0}\']","unusedOne":"#u","usedInCode":"#c"}',
    'features/t.feature': 'Feature: t\n  Scenario: s\n    Then "table.rowByName(John)" should be visible\n',
    'src/app/pages/table.page.ts': "await this.click('table.usedInCode');\n",
  });
  const report = checkLocators(root);
  expect(report.errors).toEqual([]);
  expect(report.unused).toEqual(['table.unusedOne']);
});
