import { test, expect } from '@playwright/test';

test('首页与简报入口正常', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Starry Journey/);
  await expect(page.locator('a[title="简报"]')).toBeVisible();
});

test('太阳系 2D 地图与故事线加载', async ({ page }) => {
  await page.goto('/solar/');
  await expect(page.locator('#solar-canvas')).toBeVisible();
  await expect(page.locator('#solar-stories button')).toHaveCount(3);
  await page.locator('#solar-stories button').first().click();
  await expect(page.locator('#solar-story')).toBeVisible();
  await expect(page.locator('#solar-story-progress')).toHaveText('1 / 4');
});

test('3D 视角可切换（本地 three.js）', async ({ page }) => {
  await page.goto('/solar/');
  await page.locator('#solar-mode').click();
  await expect(page.locator('#solar-canvas3d')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#solar-mode')).toHaveText('2D 视角');
});

test('3D 初始化耗时与帧率在预算内', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/solar/');
  const t0 = Date.now();
  await page.locator('#solar-mode').click();
  await expect(page.locator('#solar-canvas3d')).toBeVisible({ timeout: 20000 });
  const initMs = Date.now() - t0;
  const fps = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let frames = 0;
        const start = performance.now();
        function loop(t) {
          frames += 1;
          if (t - start < 1500) requestAnimationFrame(loop);
          else resolve(frames / ((t - start) / 1000));
        }
        requestAnimationFrame(loop);
      })
  );
  console.log(`[perf] 3D init ${initMs}ms, fps ${fps.toFixed(1)}`);
  expect(initMs).toBeLessThan(12000);
  expect(fps).toBeGreaterThan(15);
});

test('星盘页面加载与表单可用', async ({ page }) => {
  await page.goto('/astro/');
  await expect(page.locator('#astro-form')).toBeVisible();
  await expect(page.locator('#a-date')).toHaveValue('2000-01-01');
  await expect(page.locator('#a-submit')).toBeEnabled();
  await expect(page.locator('a[title="星盘"]')).toBeVisible();
});
