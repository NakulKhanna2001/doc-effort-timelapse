import { test, expect } from '@playwright/test';

test('editor is visibly rendered', async ({ page }) => {
  await page.goto('/');
  const box = await page.locator('.cm-editor').boundingBox();
  expect(box, 'editor should be on the page').not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(150);
});

test('type then replay', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cm-content').click();
  await page.keyboard.type('hello');
  await page.getByRole('button', { name: 'Generate report' }).click();
  const slider = page.getByRole('slider');
  await slider.fill('0');
  await expect(page.getByTestId('playback-doc')).toHaveText('h');
  await slider.fill('4');
  await expect(page.getByTestId('playback-doc')).toHaveText('hello');
});
