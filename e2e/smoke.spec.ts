import { expect, test, type Page } from '@playwright/test'
import { V1_LINKS, V2_LINKS } from '../src/test/share-link-fixtures.ts'

/** The part of HTMLCanvasElement we use (e2e is typechecked without the DOM lib). */
type WebGLCanvas = { getContext(contextId: 'webgl2'): object | null }

/** The sidebar text box for one part (`m`, `ft`, `in`) of a room dimension. */
function dimensionInput(page: Page, dimension: string, unit: string) {
  return page
    .getByRole('complementary', { name: 'Room plan' })
    .getByRole('group', { name: dimension, exact: true })
    .getByRole('textbox', { name: unit })
}

test('the app opens at the GitHub Pages base path, draws the default room and speakers, selects a speaker to show its distances, moves the MLP to the recommended seat, shows the seat-score heatmap, opens, follows and restores a share link, keeps a dragged speaker, and reopens a recent room', async ({
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
    // The default room's width and length are written along its walls.
    await expect(scene.getByText('← 4.5 m →')).toBeVisible()
    await expect(scene.getByText('← 6 m →')).toBeVisible()
  })

  await test.step('the default 5.1.2 speakers show with their angle and grade', async () => {
    await expect(
      page.getByRole('radio', { name: '5.1.2', checked: true }),
    ).toBeVisible()
    for (const label of [
      'L 26°',
      'C 0°',
      'R 26°',
      'Ls 115°',
      'Rs 115°',
      'Ltm 83°',
      'Rtm 83°',
    ]) {
      await expect(scene.getByText(label, { exact: true })).toBeVisible()
    }
    await expect(scene.getByText('ideal', { exact: true })).toHaveCount(7)
    await expect(
      page.getByRole('table', { name: 'Speakers' }).getByText('Left Surround'),
    ).toBeVisible()
  })

  await test.step('clicking Left selects it and shows its distances, without an undo step; Escape clears it', async () => {
    const box = await scene.locator('canvas').boundingBox()
    if (!box) throw new Error('the room view has no canvas')
    // The view fits the 6 x 4.5 m room inside a 32 px margin, with the
    // front wall at the top (src/scene/top-down.ts). Left is auto-placed
    // at (-0.868, 0.500) m (src/domain/item-distances.test.ts).
    const zoom = Math.min((box.width - 64) / 4.5, (box.height - 64) / 6)
    await page.mouse.click(
      box.x + box.width / 2 - 0.868 * zoom,
      box.y + box.height / 2 + (0.5 - 3) * zoom,
    )

    const panel = page.getByRole('region', { name: 'Selected item' })
    await expect(panel.getByRole('heading', { name: 'Left' })).toBeVisible()
    await expect(panel).toContainText('To the MLP1.98 m')
    await expect(scene.getByText('1.98 m', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled()

    await page.keyboard.press('Escape')
    await expect(panel).toContainText('Nothing selected')
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
          /^Dip at 1\d\d Hz .*front-wall .*reflection notch \(Left, Center and Right\)/,
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

  await test.step('the seat-score heatmap turns on with its legend and description', async () => {
    const toggle = page
      .getByRole('region', { name: 'Room view' })
      .getByRole('button', { name: 'Seat-score heatmap' })
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await toggle.click()

    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(
      page.getByRole('group', { name: 'Seat score (estimate)' }),
    ).toBeVisible()
    // The MLP was just moved to the recommended seat, so it stays recommended.
    await expect(scene).toHaveAccessibleName(
      /Seat-score heatmap shown \(a relative estimate\): no seat scores meaningfully better than the MLP, so it stays the recommended seat\./,
    )
  })

  await test.step('at phone width the room drawing keeps a usable height with the heatmap on', async () => {
    const desktop = page.viewportSize()
    await page.setViewportSize({ width: 390, height: 844 })

    await expect
      .poll(async () => (await scene.boundingBox())?.height ?? 0)
      .toBeGreaterThanOrEqual(300)

    if (desktop) await page.setViewportSize(desktop)
  })

  // 24 x 15 x 9 ft in imperial, 7.1.2 with two subwoofers (7.2.2).
  const { encoded } = V1_LINKS.imperialRoom
  await page.goto(`./?config=${encoded}`)
  const sharedScene = page
    .getByRole('region', { name: 'Room view' })
    .getByRole('img', { name: /24 ft 0 in long and 15 ft 0 in wide/ })

  await test.step('a share link opens its room, speakers, specs, headroom and crossover', async () => {
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
    const front = page.getByRole('group', { name: 'Front L/R' })
    await expect(front.getByRole('radio', { name: 'Tower' })).toBeChecked()
    await expect(
      front.getByRole('textbox', { name: 'Sensitivity (dB)' }),
    ).toHaveValue('90')
    await expect(
      page.getByRole('textbox', { name: 'Amplifier power per channel (W)' }),
    ).toHaveValue('125')
    await expect(
      page.getByRole('list', { name: 'Headroom' }).getByText('Rear surrounds'),
    ).toBeVisible()
    for (const label of ['L 26°', 'C 0°', 'Ls 100°', 'Lrs 143°', 'Rrs 143°']) {
      await expect(sharedScene.getByText(label, { exact: true })).toBeVisible()
    }
    // Seven listener-level speakers and two overheads.
    await expect(sharedScene.getByText('ideal', { exact: true })).toHaveCount(9)
    // Two subwoofers, at the middle of the front and back walls.
    for (const label of ['Sub1', 'Sub2']) {
      await expect(sharedScene.getByText(label, { exact: true })).toBeVisible()
    }
    await expect(
      page.getByRole('table', { name: 'Speakers' }).getByText('Subwoofer 2'),
    ).toBeVisible()
  })

  // The same room as this version writes it: version 2.
  const upgraded = V2_LINKS.imperialRoom.encoded

  await test.step('the address takes the link this version writes for the room', async () => {
    await expect(page).toHaveURL(
      (url) => url.searchParams.get('config') === upgraded,
    )
  })

  await test.step('an edit reaches the address, under the base path', async () => {
    await dimensionInput(page, 'Length', 'ft').fill('30')

    await expect(page).toHaveURL(
      (url) =>
        url.pathname === '/cinema-speaker-placement/' &&
        url.searchParams.has('config') &&
        url.searchParams.get('config') !== upgraded,
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
    // The Center is auto-placed on the center line, 0.5 m from the front
    // wall; drag it 1 m right and 1 m back.
    const from = onScreen(0, 0.5)
    const to = onScreen(1, 1.5)
    const addressBefore = page.url()

    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(to.x, to.y, { steps: 10 })
    await page.mouse.up()

    // From the MLP, 3.47 m from the front wall, it is now about
    // atan(1 / 1.97) = 27° right.
    await expect(centerLabel).toHaveText(/^C 2[678]°$/)
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

  await test.step('Recent rooms keeps each opened room and its edits, and opens the first room', async () => {
    const recent = page.getByRole('region', { name: 'Recent rooms' })
    // Newest first: the dragged room (edits after the reload), the edited
    // room, the shared 24 ft room as opened, and the first room with the
    // MLP moved.
    await expect(recent.getByRole('listitem')).toHaveCount(4)
    await expect(recent.getByRole('listitem').first()).toContainText(
      '30 ft 0 in × 15 ft 0 in × 9 ft 0 in · 7.2.2',
    )
    await expect(
      recent.getByRole('link', { name: /^24 ft 0 in × 15 ft 0 in/ }),
    ).toBeVisible()

    await recent.getByRole('link', { name: /^6 m × 4\.5 m × 2\.6 m/ }).click()

    await expect(dimensionInput(page, 'Length', 'm')).toHaveValue('6')
    await page.goBack()
    await expect(dimensionInput(page, 'Length', 'ft')).toHaveValue('30')
  })
})
