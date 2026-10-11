import { expect, test } from '@playwright/test'

test('the app shell loads at the GitHub Pages base path', async ({ page }) => {
  await page.goto('./')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Cinema Speaker Placement' }),
  ).toBeVisible()
  await expect(page.getByRole('region', { name: 'Room view' })).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Estimated response' }),
  ).toBeVisible()
})
