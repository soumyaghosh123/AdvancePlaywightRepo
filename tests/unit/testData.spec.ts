import { test, expect } from '@playwright/test';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { TestDataManager } from '@core/data/TestDataManager';
import { ConfigError } from '@core/errors';
import { tempRoot } from './helpers/tempRoot';

let dir: string;

test.beforeAll(async () => {
  dir = tempRoot('', {
    'users.json': JSON.stringify({ valid: { username: 'tomsmith' } }),
    'roles.yaml': 'admin:\n  level: 5\n',
    'accounts.csv': 'id,name\r\nA1,First\r\nA2,Second\r\n',
  });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  ws.addRow(['max', 'label']);
  ws.addRow([100, 'hundred']);
  await wb.xlsx.writeFile(path.join(dir, 'limits.xlsx'));
});

test('json/yaml/csv/xlsx lookups', async () => {
  const data = await TestDataManager.load(dir);
  expect(data.get('users.valid.username')).toBe('tomsmith');
  expect(data.get('roles.admin.level')).toBe(5);
  expect(data.get('accounts[1].id')).toBe('A2');
  expect(data.get('limits.Sheet1[0].max')).toBe(100);
  expect(data.get('limits.Sheet1[0].label')).toBe('hundred');
});

test('missing path names path and dir', async () => {
  const data = await TestDataManager.load(dir);
  expect(() => data.get('users.nope')).toThrow(ConfigError);
  expect(() => data.get('users.nope')).toThrow(/Test data 'users\.nope' not found in /);
});

test('missing dir is an empty manager', async () => {
  const data = await TestDataManager.load(path.join(dir, 'nope'));
  expect(() => data.get('a.b')).toThrow(/Test data 'a\.b' not found/);
});
