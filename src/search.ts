/** The root route's search params: how the share link holds the config. */
export type AppSearch = {
  /** The encoded config: the whole config, compressed (see encodeConfig). */
  config?: string
}

/**
 * Keeps a `config` param whatever it holds. The default search parser turns
 * text that looks like a number, boolean or JSON into that value; an
 * encoded config is always text, so anything else is passed on as text and
 * fails to decode, which shows the broken-link message.
 */
export function validateSearch(search: Record<string, unknown>): AppSearch {
  const { config } = search
  if (config === undefined) return {}
  return {
    config: typeof config === 'string' ? config : JSON.stringify(config),
  }
}

/** A search-param update that sets the encoded config and keeps the rest. */
export function withConfigParam(encoded: string) {
  return (search: AppSearch): AppSearch => ({ ...search, config: encoded })
}
