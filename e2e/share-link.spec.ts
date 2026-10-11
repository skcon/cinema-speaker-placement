import { expect, test, type Page } from '@playwright/test'
import { V1_LINKS } from '../src/test/share-link-fixtures.ts'

// A 24 x 15 x 9 ft room in imperial.
const SHARED_ROOM = V1_LINKS.imperialRoom.encoded

/** The sidebar text box for one part (`m`, `ft`, `in`) of a room dimension. */
function dimensionInput(page: Page, dimension: string, unit: string) {
  return page
    .getByRole('complementary', { name: 'Room and layout' })
    .getByRole('group', { name: dimension })
    .getByRole('textbox', { name: unit })
}

test('a share link opens its room under the base path, follows edits and survives a reload', async ({
  page,
}) => {
  await page.goto(`./?config=${SHARED_ROOM}`)

  await expect(
    page.getByRole('radio', { name: 'Imperial (ft + in)' }),
  ).toBeChecked()
  await expect(dimensionInput(page, 'Length', 'ft')).toHaveValue('24')
  await expect(dimensionInput(page, 'Width', 'ft')).toHaveValue('15')
  await expect(dimensionInput(page, 'Height', 'ft')).toHaveValue('9')
  await expect(
    page
      .getByRole('region', { name: 'Room view' })
      .getByRole('img', { name: /24 ft 0 in long and 15 ft 0 in wide/ }),
  ).toBeVisible()

  await dimensionInput(page, 'Length', 'ft').fill('30')

  await expect(page).toHaveURL(
    (url) =>
      url.pathname === '/cinema-speaker-placement/' &&
      url.searchParams.has('config') &&
      url.searchParams.get('config') !== SHARED_ROOM,
  )
  await page.reload()
  await expect(dimensionInput(page, 'Length', 'ft')).toHaveValue('30')
  await expect(dimensionInput(page, 'Width', 'ft')).toHaveValue('15')
})

test('Copy link copies a link that opens the same room', async ({
  page,
  context,
}) => {
  // Capture what the app copies instead of using the system clipboard.
  await page.addInitScript(() => {
    const copied: string[] = []
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: {
        writeText: (text: string) => {
          copied.push(text)
          return Promise.resolve()
        },
      },
    })
    Object.assign(globalThis, { copiedTexts: copied })
  })
  await page.goto(`./?config=${SHARED_ROOM}`)
  await dimensionInput(page, 'Height', 'ft').fill('10')

  await page.getByRole('button', { name: 'Copy link' }).click()

  await expect(page.getByText('Link copied')).toBeVisible()
  const [link] = await page.evaluate(
    () => (globalThis as unknown as { copiedTexts: string[] }).copiedTexts,
  )
  expect(link).toMatch(
    /^http:\/\/localhost:\d+\/cinema-speaker-placement\/\?config=/,
  )
  const recipient = await context.newPage()
  await recipient.goto(link ?? '')
  await expect(dimensionInput(recipient, 'Height', 'ft')).toHaveValue('10')
  await expect(dimensionInput(recipient, 'Length', 'ft')).toHaveValue('24')
})

test('a broken share link shows the default room and says why', async ({
  page,
}) => {
  await page.goto('./?config=not-a-room')

  await expect(page.getByRole('alert')).toContainText(
    'This link couldn’t be opened',
  )
  await expect(dimensionInput(page, 'Length', 'm')).toHaveValue('6')
})
