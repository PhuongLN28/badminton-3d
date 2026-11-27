import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const FORBIDDEN_PATTERNS = [
  "from 'three'",
  'from "three"',
  "import('three')",
  'import("three")',
  'window.',
  'document.',
  'Math.random',
  'Date.now',
  'performance.now',
] as const;

function collectTypeScriptFiles(dirPath: string): string[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTypeScriptFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      results.push(fullPath);
    }
  }

  return results;
}

describe('Kiến trúc src/shared thuần khiết', () => {
  it('P0-U05 Kiến trúc: src/shared không chứa three, window, document, Math.random, Date.now, performance.now', () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const sharedDir = path.resolve(currentDir, '../../src/shared');

    expect(fs.existsSync(sharedDir)).toBe(true);
    const files = collectTypeScriptFiles(sharedDir);
    expect(files.length).toBeGreaterThanOrEqual(4);

    const violations: string[] = [];
    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (content.includes(pattern)) {
          violations.push(`${path.relative(sharedDir, filePath)} chứa "${pattern}"`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
