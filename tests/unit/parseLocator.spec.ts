import { test, expect } from '@playwright/test';
import { parseLocator, parseKeyRef, fillParams, type LocatorDescriptor } from '@core/locators/parseLocator';
import { LocatorSyntaxError } from '@core/errors';

const cases: [string, LocatorDescriptor][] = [
  ['css=button.primary', { kind: 'selector', selector: 'css=button.primary' }],
  ['xpath=//a', { kind: 'selector', selector: 'xpath=//a' }],
  ['//div[@id="x"]', { kind: 'selector', selector: 'xpath=//div[@id="x"]' }],
  ['.//input', { kind: 'selector', selector: 'xpath=.//input' }],
  ['(//*[@type="submit"])[1]', { kind: 'selector', selector: 'xpath=(//*[@type="submit"])[1]' }],
  ['[placeholder="Username"]', { kind: 'selector', selector: '[placeholder="Username"]' }],
  ['id=password', { kind: 'selector', selector: 'id=password' }],
  ['text=Log in', { kind: 'selector', selector: 'text=Log in' }],
  ["role=button[name='Log in']", { kind: 'role', role: 'button', name: 'Log in' }],
  ['role=button[name="Log in"]', { kind: 'role', role: 'button', name: 'Log in' }],
  ['role=heading', { kind: 'role', role: 'heading' }],
  ['testid=submit', { kind: 'testid', value: 'submit' }],
  ['label=Email', { kind: 'label', value: 'Email' }],
  ['placeholder=Search', { kind: 'placeholder', value: 'Search' }],
  [`By.xpath(".//input[@placeholder='Username']")`, { kind: 'selector', selector: "xpath=.//input[@placeholder='Username']" }],
  [`By.xpath("//a[@href='x=1' and text()=\\"Go\\"]")`, { kind: 'selector', selector: `xpath=//a[@href='x=1' and text()="Go"]` }],
  ['By.id("password")', { kind: 'selector', selector: 'id=password' }],
  ['By.cssSelector("button[type=submit]")', { kind: 'selector', selector: 'css=button[type=submit]' }],
  ['By.name("q")', { kind: 'selector', selector: 'css=[name="q"]' }],
  ['By.linkText("Help")', { kind: 'selector', selector: 'css=a:text-is("Help")' }],
  ['By.partialLinkText("Hel")', { kind: 'selector', selector: 'css=a:has-text("Hel")' }],
  ['By.className("btn")', { kind: 'selector', selector: 'css=.btn' }],
  ['By.tagName("h1")', { kind: 'selector', selector: 'css=h1' }],
  ['  By.id("x")  ', { kind: 'selector', selector: 'id=x' }],
  [`By.xpath( "//a" )`, { kind: 'selector', selector: 'xpath=//a' }],
];

for (const [raw, expected] of cases) {
  test(`parses ${raw.trim()}`, () => {
    expect(parseLocator(raw)).toEqual(expected);
  });
}

test('unknown By.* strategy is rejected', () => {
  expect(() => parseLocator('By.foo("x")')).toThrow(LocatorSyntaxError);
  expect(() => parseLocator('By.foo("x")')).toThrow(/By\.foo/);
});

test('malformed By.* is rejected', () => {
  expect(() => parseLocator('By.xpath(//a)')).toThrow(LocatorSyntaxError);
});

test('empty is rejected', () => {
  expect(() => parseLocator('  ')).toThrow(/empty locator/);
});

test('parseKeyRef', () => {
  expect(parseKeyRef('login.btn')).toEqual({ key: 'login.btn', args: [] });
  expect(parseKeyRef('table.row(John Smith, 2)')).toEqual({ key: 'table.row', args: ['John Smith', '2'] });
  expect(parseKeyRef('a.b()')).toEqual({ key: 'a.b', args: [] });
  expect(parseKeyRef(' a.b ')).toEqual({ key: 'a.b', args: [] });
});

test('fillParams', () => {
  expect(fillParams("//tr[td='{0}'][{1}]", ['A', '2'])).toBe("//tr[td='A'][2]");
  expect(fillParams('#plain', [])).toBe('#plain');
  expect(() => fillParams("//tr[td='{0}'][{1}]", ['A'])).toThrow(/\{1\}/);
});
