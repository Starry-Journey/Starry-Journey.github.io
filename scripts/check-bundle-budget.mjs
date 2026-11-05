// 检查关键资源体积预算，超出直接失败
import { stat } from 'node:fs/promises';

const BUDGETS = [
  { file: 'public/js/solar.js', max: 120 * 1024, label: '太阳系主脚本' },
  { file: 'public/js/vendor/three.min.js', max: 700 * 1024, label: 'three.js vendor' },
  { file: 'public/css/solar.css', max: 20 * 1024, label: '太阳系样式' },
  { file: 'public/images/textures', max: 1024 * 1024, label: '行星贴图目录', dir: true },
];

async function sizeOf(path, dir) {
  if (!dir) return (await stat(path)).size;
  const { readdir } = await import('node:fs/promises');
  let total = 0;
  for (const f of await readdir(path)) total += (await stat(`${path}/${f}`)).size;
  return total;
}

let failed = false;
for (const b of BUDGETS) {
  try {
    const size = await sizeOf(b.file, b.dir);
    const kb = (size / 1024).toFixed(1);
    const ok = size <= b.max;
    console.log(`${ok ? '✓' : '✗'} ${b.label}: ${kb}KB / ${(b.max / 1024).toFixed(0)}KB`);
    if (!ok) failed = true;
  } catch {
    console.log(`✗ ${b.label}: 无法读取 ${b.file}`);
    failed = true;
  }
}
if (failed) process.exit(1);
