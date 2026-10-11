import { expect, test } from '@playwright/test'

/** The part of HTMLCanvasElement we use (e2e is typechecked without the DOM lib). */
type WebGLCanvas = { getContext(contextId: 'webgl2'): object | null }

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

test('the room view draws the default room with WebGL at the base path', async ({
  page,
}) => {
  await page.goto('./')

  const scene = page
    .getByRole('region', { name: 'Room view' })
    .getByRole('img', {
      name: /^Top-down view of the room, 6 m long and 4\.5 m wide/,
    })
  const canvas = scene.locator('canvas')
  await expect(canvas).toBeVisible()
  const box = await canvas.boundingBox()
  expect(box?.width).toBeGreaterThan(100)
  expect(box?.height).toBeGreaterThan(100)
  // Three.js holds a WebGL 2 context on this canvas, so asking for one
  // returns it rather than null.
  expect(
    await canvas.evaluate((element: unknown) =>
      Boolean((element as WebGLCanvas).getContext('webgl2')),
    ),
  ).toBe(true)
  // The labels are placed from the scene's camera, so they show once it renders.
  await expect(scene.getByText('Front wall')).toBeVisible()
  await expect(scene.getByText('MLP')).toBeVisible()
})
