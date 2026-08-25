import { test, expect } from '@playwright/test';

test('type then replay', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cm-content').click();
  await page.keyboard.type('hello');
  await page.getByText('Load timelapse').click();
  const slider = page.getByRole('slider');
  await slider.fill('0');
  await expect(page.getByTestId('playback-doc')).toHaveText('h');
  await slider.fill('4');
  await expect(page.getByTestId('playback-doc')).toHaveText('hello');
});
