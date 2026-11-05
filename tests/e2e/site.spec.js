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
