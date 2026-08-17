/**
 * Rewrites CRLF line endings as LF across the repository's text files.
 *
 * The project is edited on Windows but every artefact runs on Linux. Shell
 * scripts and container entrypoints with CRLF endings fail with confusing
 * "not found" errors inside a container, so normalising the working tree is
 * not cosmetic. .gitattributes covers what git stores; this covers what Docker
 * reads directly from disk.
 *
 * Usage: node scripts/normalize-line-endings.mjs [directory]
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const SKIP_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.tmp',
  'generated',
]);

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.yml',
  '.yaml',
  '.sh',
  '.sql',
  '.prisma',
  '.html',
  '.css',
  '.txt',
  '.example',
]);

const TEXT_FILENAMES = new Set([
  '.gitignore',
  '.gitattributes',
  '.dockerignore',
  '.prettierignore',
  'Dockerfile',
  'Caddyfile',
]);

const MAX_FILE_BYTES = 5_000_000;

function isTextFile(name) {
  return (
    TEXT_EXTENSIONS.has(extname(name)) || TEXT_FILENAMES.has(name) || name.startsWith('Dockerfile.')
  );
}

function walk(directory, converted) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!SKIP_DIRECTORIES.has(entry.name)) {
        walk(path, converted);
      }
      continue;
    }

    if (!entry.isFile() || !isTextFile(entry.name) || statSync(path).size > MAX_FILE_BYTES) {
      continue;
    }

    const original = readFileSync(path, 'utf8');

    if (original.includes('\r\n')) {
      writeFileSync(path, original.replaceAll('\r\n', '\n'), 'utf8');
      converted.push(path);
    }
  }
}

const root = resolve(process.argv[2] ?? '.');
const converted = [];
walk(root, converted);

console.log(
  converted.length === 0
    ? 'All text files already use LF line endings'
    : `Converted ${converted.length} file(s) to LF:\n  ${converted.join('\n  ')}`,
);
