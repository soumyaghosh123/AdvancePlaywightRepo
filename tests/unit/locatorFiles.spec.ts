import { test, expect } from '@playwright/test';
import { loadLocatorFiles, parseProperties } from '@core/locators/loadLocatorFiles';
import { ConfigError } from '@core/errors';
import { tempRoot } from './helpers/tempRoot';

test('json string, array and object forms', () => {
  const dir = tempRoot('', {
    'login.locators.json': JSON.stringify({
      username: '[placeholder="Username"]',
      loginBtn: ["role=button[name='Log in']", 'xpath=(//*[@type="submit"])[1]'],
    }),
    'nested/frame.locators.json': JSON.stringify({
      inner: { candidates: ['#inner'], frame: 'iframe#f' },
      single: { value: '#one', frame: 'iframe#g' },
    }),
  });
  const map = loadLocatorFiles(dir);
  expect(map['login.username'].candidates).toEqual(['[placeholder="Username"]']);
  expect(map['login.loginBtn'].candidates).toHaveLength(2);
  expect(map['frame.inner']).toMatchObject({ candidates: ['#inner'], frame: 'iframe#f' });
  expect(map['frame.single']).toMatchObject({ candidates: ['#one'], frame: 'iframe#g' });
  expect(map['login.username'].source).toMatch(/login\.locators\.json$/);
});

test('invalid json value type names file and key', () => {
  const dir = tempRoot('', { 'bad.locators.json': JSON.stringify({ k: 42 }) });
  expect(() => loadLocatorFiles(dir)).toThrow(/bad\.locators\.json.*\bk\b/);
});

test('properties with Selenium values, = and quotes inside', () => {
  const props = parseProperties(
    `advance=By.xpath("//a[text()='Advanced Search']|//button[contains(text(),'Advanced')]")\n` +
      `go = By.xpath("//a[@href='x=1' and text()=\\"Go\\"]")\n`,
  );
  expect(props.advance).toBe(`By.xpath("//a[text()='Advanced Search']|//button[contains(text(),'Advanced')]")`);
  expect(props.go).toBe(`By.xpath("//a[@href='x=1' and text()=\\"Go\\"]")`);
});

test('properties ignores comments and section headers', () => {
  expect(parseProperties('//****\nLogin_Page\n# c\n! bang\n\nk=v\n')).toEqual({ k: 'v' });
});

test('CRLF and BOM are stripped', () => {
  expect(parseProperties('﻿a=b\r\nc = d \r\n')).toEqual({ a: 'b', c: 'd' });
});

test('page name from file name', () => {
  const dir = tempRoot('', { 'sampleSecure.properties': 'flash = By.id("flash")\n' });
  expect(loadLocatorFiles(dir)['sampleSecure.flash'].candidates).toEqual(['By.id("flash")']);
});

test('duplicate key across files names both files', () => {
  const dir = tempRoot('', { 'a.locators.json': '{"x":"#x"}', 'sub/a.properties': 'x=#y\n' });
  expect(() => loadLocatorFiles(dir)).toThrow(ConfigError);
  expect(() => loadLocatorFiles(dir)).toThrow(
    /a\.locators\.json[\s\S]*a\.properties|a\.properties[\s\S]*a\.locators\.json/,
  );
});

test('missing directory gives an empty map', () => {
  expect(loadLocatorFiles(tempRoot('') + '/nope')).toEqual({});
});

test('locators.json: one file, a section per page', () => {
  const dir = tempRoot('', {
    'locators.json': JSON.stringify({
      login: { username: '#user', loginBtn: ['#old', "role=button[name='Log in']"] },
      quote: { price: { value: 'td.price', frame: 'iframe#q' } },
    }),
  });
  const map = loadLocatorFiles(dir);
  expect(map['login.username'].candidates).toEqual(['#user']);
  expect(map['login.loginBtn'].candidates).toHaveLength(2);
  expect(map['quote.price']).toMatchObject({ candidates: ['td.price'], frame: 'iframe#q' });
  expect(map['login.username'].source).toMatch(/locators\.json$/);
});

test('locators.json: a section that is not an object names the section', () => {
  const dir = tempRoot('', { 'locators.json': JSON.stringify({ login: '#user' }) });
  expect(() => loadLocatorFiles(dir)).toThrow(/locators\.json.*section 'login'/);
});

test('locators.json: duplicate with a per-page file is reported', () => {
  const dir = tempRoot('', { 'locators.json': '{"login":{"x":"#x"}}', 'login.locators.json': '{"x":"#y"}' });
  expect(() => loadLocatorFiles(dir)).toThrow(/Duplicate locator 'login\.x'/);
});
