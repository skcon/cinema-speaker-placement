import { expect, test, type Page } from '@playwright/test'
import { V1_LINKS } from '../src/test/share-link-fixtures.ts'

/** The part of HTMLCanvasElement we use (e2e is typechecked without the DOM lib). */
type WebGLCanvas = { getContext(contextId: 'webgl2'): object | null }

/** The sidebar text box for one part (`m`, `ft`, `in`) of a room dimension. */
function dimensionInput(page: Page, dimension: string, unit: string) {
  return page
    .getByRole('complementary', { name: 'Room and layout' })
    .getByRole('group', { name: dimension })
    .getByRole('textbox', { name: unit })
}

test('the app opens at the GitHub Pages base path, draws the default room and speakers, and opens, follows and restores a share link', async ({
  page,
}) => {
  await page.goto('./')

  await test.step('the app shell loads', async () => {
    await expect(
      page.getByRole('heading', { level: 1, name: 'Cinema Speaker Placement' }),
    ).toBeVisible()
    await expect(page.getByRole('region', { name: 'Room view' })).toBeVisible()
    await expect(
      page.getByRole('region', { name: 'Estimated response' }),
    ).toBeVisible()
  })

  const scene = page
    .getByRole('region', { name: 'Room view' })
    .getByRole('img', {
      name: /^Top-down view of the room, 6 m long and 4\.5 m wide/,
    })

  await test.step('the room view draws the default room with WebGL', async () => {
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

  await test.step('the default 5.1.2 speakers show with their angle and grade', async () => {
    await expect(
      page.getByRole('radio', { name: '5.1.2', checked: true }),
    ).toBeVisible()
    for (const label of ['L 26°', 'C 0°', 'R 26°', 'Ls 115°', 'Rs 115°']) {
      await expect(scene.getByText(label, { exact: true })).toBeVisible()
    }
    await expect(scene.getByText('ideal', { exact: true })).toHaveCount(5)
    await expect(
      page.getByRole('table', { name: 'Speakers' }).getByText('Left Surround'),
    ).toBeVisible()
  })

  await test.step('the estimated response is charted, with its summary and the estimate note', async () => {
    const panel = page.getByRole('region', { name: 'Estimated response' })
    const chart = panel.getByRole('img', {
      name: /^Chart of the estimated response at the MLP against the flat target/,
    })
    await expect(chart).toBeVisible()
    // Recharts draws the target and the estimate as SVG paths.
    const curves = chart.locator('path.recharts-line-curve')
    await expect(curves).toHaveCount(2)
    const estimate = await curves.last().boundingBox()
    expect(estimate?.width).toBeGreaterThan(100)
    expect(estimate?.height).toBeGreaterThan(20)
    await expect(
      panel.getByText(/^Within ±3 dB of the flat target/),
    ).toBeVisible()
    await expect(
      panel.getByText(
        'An estimate from a simplified model, never a measurement.',
      ),
    ).toBeVisible()
  })

  // 24 x 15 x 9 ft in imperial, 7.1.2 with two subwoofers (7.2.2).
  const { encoded } = V1_LINKS.imperialRoom
  await page.goto(`./?config=${encoded}`)
  const sharedScene = page
    .getByRole('region', { name: 'Room view' })
    .getByRole('img', { name: /24 ft 0 in long and 15 ft 0 in wide/ })

  await test.step('a share link opens its room and speakers', async () => {
    await expect(
      page.getByRole('radio', { name: 'Imperial (ft + in)' }),
    ).toBeChecked()
    await expect(dimensionInput(page, 'Length', 'ft')).toHaveValue('24')
    await expect(dimensionInput(page, 'Width', 'ft')).toHaveValue('15')
    await expect(dimensionInput(page, 'Height', 'ft')).toHaveValue('9')
    await expect(
      page.getByRole('radio', { name: '7.2.2', checked: true }),
    ).toBeVisible()
    for (const label of ['L 26°', 'C 0°', 'Ls 100°', 'Lrs 143°', 'Rrs 143°']) {
      await expect(sharedScene.getByText(label, { exact: true })).toBeVisible()
    }
    await expect(sharedScene.getByText('ideal', { exact: true })).toHaveCount(7)
    // Two subwoofers, at the middle of the front and back walls.
    for (const label of ['Sub1', 'Sub2']) {
      await expect(sharedScene.getByText(label, { exact: true })).toBeVisible()
    }
    await expect(
      page.getByRole('table', { name: 'Speakers' }).getByText('Subwoofer 2'),
    ).toBeVisible()
  })

  await test.step('an edit reaches the address, under the base path', async () => {
    await dimensionInput(page, 'Length', 'ft').fill('30')

    await expect(page).toHaveURL(
      (url) =>
        url.pathname === '/cinema-speaker-placement/' &&
        url.searchParams.has('config') &&
        url.searchParams.get('config') !== encoded,
    )
  })

  await test.step('a reload restores the edited room', async () => {
    await page.reload()

    await expect(dimensionInput(page, 'Length', 'ft')).toHaveValue('30')
    await expect(dimensionInput(page, 'Width', 'ft')).toHaveValue('15')
    await expect(
      page.getByRole('radio', { name: '7.2.2', checked: true }),
    ).toBeVisible()
    await expect(
      page
        .getByRole('region', { name: 'Room view' })
        .getByRole('img', { name: /30 ft 0 in long and 15 ft 0 in wide/ }),
    ).toBeVisible()
  })
})
