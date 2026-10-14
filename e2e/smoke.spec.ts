import { expect, test, type Page } from '@playwright/test'
import { V1_LINKS } from '../src/test/share-link-fixtures.ts'

/** The part of HTMLCanvasElement we use (e2e is typechecked without the DOM lib). */
type WebGLCanvas = { getContext(contextId: 'webgl2'): object | null }

/** The sidebar text box for one part (`m`, `ft`, `in`) of a room dimension. */
function dimensionInput(page: Page, dimension: string, unit: string) {
  return page
    .getByRole('complementary', { name: 'Room and layout' })
    .getByRole('group', { name: dimension, exact: true })
    .getByRole('textbox', { name: unit })
}

test('the app opens at the GitHub Pages base path, draws the default room and speakers, moves the MLP to the recommended seat, opens, follows and restores a share link, and keeps a dragged speaker', async ({
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

  await test.step('the estimated response is charted, with its summary, weaknesses and the estimate note', async () => {
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
      panel
        .getByRole('list', { name: 'Weaknesses' })
        .getByText(
          /^Dip at 18\d Hz .*front-wall reflection notch \(Left and Right\)/,
        ),
    ).toBeVisible()
    await expect(
      panel.getByText(
        'An estimate from a simplified model, never a measurement.',
      ),
    ).toBeVisible()
  })

  await test.step('the recommended seat is ringed, and "Move MLP here" moves the MLP there and reaches the address', async () => {
    await expect(scene.getByText('Recommended', { exact: true })).toBeVisible()
    const seating = page.getByRole('region', { name: 'Seating' })
    const move = seating.getByRole('button', { name: 'Move MLP here' })
    await expect(move).toBeEnabled()
    const addressBefore = page.url()

    await move.click()

    await expect(page).toHaveURL((url) => url.href !== addressBefore)
    await expect(
      seating.getByText(/^Your MLP is at the recommended seat/),
    ).toBeVisible()
    await expect(move).toBeDisabled()
    await expect(
      page.getByRole('group', { name: 'MLP position' }),
    ).toContainText('manual')
  })

  // 24 x 15 x 9 ft in imperial, 7.1.2 with two subwoofers (7.2.2).
  const { encoded } = V1_LINKS.imperialRoom
  await page.goto(`./?config=${encoded}`)
  const sharedScene = page
    .getByRole('region', { name: 'Room view' })
    .getByRole('img', { name: /24 ft 0 in long and 15 ft 0 in wide/ })

  await test.step('a share link opens its room, speakers and crossover', async () => {
    await expect(
      page.getByRole('radio', { name: 'Imperial (ft + in)' }),
    ).toBeChecked()
    await expect(dimensionInput(page, 'Length', 'ft')).toHaveValue('24')
    await expect(dimensionInput(page, 'Width', 'ft')).toHaveValue('15')
    await expect(dimensionInput(page, 'Height', 'ft')).toHaveValue('9')
    await expect(
      page.getByRole('radio', { name: '7.2.2', checked: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('textbox', { name: 'Crossover (Hz)' }),
    ).toHaveValue('120')
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

  const editedScene = page
    .getByRole('region', { name: 'Room view' })
    .getByRole('img', { name: /30 ft 0 in long and 15 ft 0 in wide/ })
  const centerLabel = editedScene.getByText(/^C \d+°$/)

  await test.step('dragging a speaker moves it and reaches the address', async () => {
    await expect(centerLabel).toHaveText('C 0°')
    const box = await editedScene.locator('canvas').boundingBox()
    if (!box) throw new Error('the room view has no canvas')
    // The view fits the 30 x 15 ft room inside a 32 px margin, with the
    // front wall at the top (src/scene/top-down.ts).
    const room = { length: 30 * 0.3048, width: 15 * 0.3048 }
    const zoom = Math.min(
      (box.width - 64) / room.width,
      (box.height - 64) / room.length,
    )
    const onScreen = (x: number, y: number) => ({
      x: box.x + box.width / 2 + x * zoom,
      y: box.y + box.height / 2 + (y - room.length / 2) * zoom,
    })
    // The Center is auto-placed on the center line, 0.3 m from the front
    // wall; drag it 1 m right and 1 m back.
    const from = onScreen(0, 0.3)
    const to = onScreen(1, 1.3)
    const addressBefore = page.url()

    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(to.x, to.y, { steps: 10 })
    await page.mouse.up()

    // From the MLP, 3.47 m from the front wall, it is now about 25° right.
    await expect(centerLabel).toHaveText(/^C 2[456]°$/)
    await expect(page).toHaveURL((url) => url.href !== addressBefore)
  })

  await test.step('a reload restores the dragged speaker', async () => {
    const draggedLabel = await centerLabel.textContent()

    await page.reload()

    await expect(centerLabel).toHaveText(draggedLabel ?? '')
    await expect(
      page.getByRole('group', { name: 'Center position' }),
    ).toContainText('manual')
  })
})
