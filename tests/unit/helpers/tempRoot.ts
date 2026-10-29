import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Copies a fixture directory to a fresh temp dir and writes extra files on top. */
export function tempRoot(fixtureDir: string, extraFiles: Record<string, string> = {}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pwfw-'));
  if (fixtureDir) fs.cpSync(fixtureDir, root, { recursive: true });
  for (const [rel, content] of Object.entries(extraFiles)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}
