import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Config } from '@/domain'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'
import { mockClipboard } from '@/test/clipboard'
import { CopyLinkButton } from '@/ui/CopyLinkButton'

/** Stands in for the app's share links: the room length is enough here. */
function shareLinkFor(config: Config) {
  return `https://example.test/?length=${config.room.length}`
}

function renderButton() {
  render(
    <ConfigStoreProvider>
      <CopyLinkButton shareLinkFor={shareLinkFor} />
    </ConfigStoreProvider>,
  )
}

describe('copy link button', () => {
  it("copies the current room's share link and says so", async () => {
    const writeText = mockClipboard()
    renderButton()

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Link copied')
    expect(writeText).toHaveBeenCalledWith('https://example.test/?length=6')
  })

  it('says so when the browser refuses to copy', async () => {
    mockClipboard({ error: new Error('Permission denied') })
    renderButton()

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Couldn’t copy the link. Copy it from the address bar instead.',
    )
  })
})
