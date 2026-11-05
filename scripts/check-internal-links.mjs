// 检查 public/ 中站内链接与静态资源是否存在（不检查外链）
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOT = 'public';
const broken = [];

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}

function targetFor(url) {
  let clean = url.split('#')[0].split('?')[0];
  try { clean = decodeURIComponent(clean); } catch { /* 保持原样 */ }
  if (!clean || clean === '/') return 'public/index.html';
  const rel = clean.replace(/^\//, '');
  if (clean.endsWith('/')) return join('public', rel, 'index.html');
  if (extname(rel)) return join('public', rel);
  return join('public', rel, 'index.html');
}

const files = (await walk(ROOT)).filter((f) => f.endsWith('.html'));
for (const file of files) {
  const html = await readFile(file, 'utf8');
  const urls = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const url of urls) {
    if (!url.startsWith('/') || url.startsWith('//')) continue;
    if (/^\/(#|mailto:|javascript:)/.test(url)) continue;
    const target = targetFor(url);
    try {
      await stat(target);
    } catch {
      broken.push(`${file} -> ${url}`);
    }
  }
}

if (broken.length) {
  console.error(`发现 ${broken.length} 个站内断链：`);
  for (const b of broken.slice(0, 30)) console.error('  ' + b);
  process.exit(1);
}
console.log(`链接检查通过：${files.length} 个 HTML 页面`);
