import { test, expect } from '@playwright/test';

test('首页与简报入口正常', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Starry Journey/);
  await expect(page.locator('a[title="简报"]')).toBeVisible();
});

test('太阳系三维地图加载与时间轴联动', async ({ page }) => {
  await page.goto('/solar/');
  await expect(page.locator('#solar-canvas3d')).toHaveAttribute('data-ready', '1', {
    timeout: 20000,
  });
  // 二维视图与视角切换按钮应已彻底移除
  await expect(page.locator('#solar-canvas')).toHaveCount(0);
  await expect(page.locator('#solar-mode')).toHaveCount(0);
  await expect(page.locator('#solar-loading')).toBeHidden();
  await expect(page.locator('#solar-labels .solar-label:visible').first()).toBeVisible();

  await page.$eval('#solar-slider', (el) => {
    el.value = '1970';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#solar-year')).toHaveText('1970.0');

  await expect(page.locator('#solar-stories button')).toHaveCount(3);
  await page.locator('#solar-stories button').first().click();
  await expect(page.locator('#solar-story')).toBeVisible();
  await expect(page.locator('#solar-story-progress')).toHaveText('1 / 4');
  await expect(page.locator('#solar-year')).toHaveText('1957.0');
});

test('聚焦天体后镜头跟随，播放时交还镜头', async ({ page }) => {
  await page.goto('/solar/?debug=1');
  await page.waitForSelector('#solar-canvas3d[data-ready="1"]', { timeout: 20000 });
  await page.locator('#solar-stories button').first().click();
  await page.waitForFunction(() => window.solarDebug().follow !== null, null, { timeout: 8000 });
  await page.locator('#solar-story-close').click();

  // 暂停状态下跨年份拖动，锁定目标应仍被镜头跟住
  await page.$eval('#solar-slider', (el) => {
    el.value = '1962';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(400);
  const focused = await page.evaluate(() => window.solarDebug());
  expect(focused.year).toBeCloseTo(1962, 0);
  expect(Math.abs(focused.focusNdc[0])).toBeLessThan(0.15);
  expect(Math.abs(focused.focusNdc[1])).toBeLessThan(0.15);

  // 播放 = 看全局，镜头应取消锁定，避免追着公转天体乱晃
  await page.locator('#solar-play').click();
  await page.waitForFunction(() => window.solarDebug().follow === null, null, { timeout: 5000 });
});

test('三维首帧耗时与帧率在预算内', async ({ page }) => {
  test.setTimeout(60000);
  const t0 = Date.now();
  await page.goto('/solar/');
  await page.waitForSelector('#solar-canvas3d[data-ready="1"]', { timeout: 20000 });
  const initMs = Date.now() - t0;
  // 等动态分辨率收敛到稳定倍率后再测，测的是稳态帧率而不是抖动过程
  await page.waitForTimeout(2500);
  const fps = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let frames = 0;
        const start = performance.now();
        function loop(t) {
          frames += 1;
          if (t - start < 2500) requestAnimationFrame(loop);
          else resolve(frames / ((t - start) / 1000));
        }
        requestAnimationFrame(loop);
      })
  );
  await page.waitForFunction(
    () => document.querySelector('#solar-canvas3d').hasAttribute('data-cost'),
    null,
    {
      timeout: 8000,
    }
  );
  const cost = parseFloat(await page.getAttribute('#solar-canvas3d', 'data-cost'));
  const dpr = parseFloat(await page.getAttribute('#solar-canvas3d', 'data-dpr'));
  console.log(`[perf] 3D 首帧 ${initMs}ms, fps ${fps.toFixed(1)}, 单帧 ${cost}ms, dpr ${dpr}`);
  expect(initMs).toBeLessThan(8000);
  expect(fps).toBeGreaterThan(15);
  // 主线程占用（WebGL 提交是异步的，真实帧率由上面的 fps 把关）
  expect(cost).toBeLessThan(40);
});

test('星盘页面加载与表单可用', async ({ page }) => {
  await page.goto('/astro/');
  await expect(page.locator('#astro-form')).toBeVisible();
  await expect(page.locator('#a-date')).toHaveValue('2000-01-01');
  await expect(page.locator('#a-submit')).toBeEnabled();
  await expect(page.locator('a[title="星盘"]')).toBeVisible();
});
