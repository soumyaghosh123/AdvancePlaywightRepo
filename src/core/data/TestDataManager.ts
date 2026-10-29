import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { parse as parseCsv } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import { ConfigError } from '../errors';

type Data = Record<string, unknown>;

async function readXlsx(file: string): Promise<Record<string, Data[]>> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const sheets: Record<string, Data[]> = {};
  wb.eachSheet((ws) => {
    const header = (ws.getRow(1).values as unknown[]).slice(1).map(String);
    const rows: Data[] = [];
    ws.eachRow((row, n) => {
      if (n === 1) return;
      const values = (row.values as unknown[]).slice(1);
      rows.push(Object.fromEntries(header.map((h, i) => [h, values[i] ?? null])));
    });
    sheets[ws.name] = rows;
  });
  return sheets;
}

async function readFile(file: string): Promise<unknown> {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.xlsx') return readXlsx(file);
  const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  if (ext === '.json') return JSON.parse(text);
  if (ext === '.yaml' || ext === '.yml') return YAML.parse(text);
  return parseCsv(text, { columns: true, skip_empty_lines: true, trim: true });
}

/** Reads test-data/<env>/*.{json,yaml,yml,csv,xlsx}; the file name (without extension) is the first path segment. */
export class TestDataManager {
  private constructor(
    private readonly dir: string,
    private readonly files: Data,
  ) {}

  static async load(dir: string): Promise<TestDataManager> {
    const files: Data = {};
    if (fs.existsSync(dir)) {
      for (const name of fs.readdirSync(dir)) {
        if (!/\.(json|ya?ml|csv|xlsx)$/i.test(name)) continue;
        const file = path.join(dir, name);
        try {
          files[name.replace(/\.[^.]+$/, '')] = await readFile(file);
        } catch (e) {
          throw new ConfigError(`${file}: cannot read test data: ${(e as Error).message}`);
        }
      }
    }
    return new TestDataManager(dir, files);
  }

  /** 'users.valid.username', 'accounts[0].id', 'limits.Sheet1[0].max' */
  get<T = unknown>(dataPath: string): T {
    let value: unknown = this.files;
    for (const part of dataPath.split(/[.[\]]+/).filter(Boolean)) {
      if (value === null || typeof value !== 'object' || !(part in value)) {
        throw new ConfigError(`Test data '${dataPath}' not found in ${this.dir}`);
      }
      value = (value as Data)[part];
    }
    return value as T;
  }
}
