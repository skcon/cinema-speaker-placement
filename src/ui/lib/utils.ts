/**
 * Join class names and resolve Tailwind conflicts (later classes win). The
 * `cn` package replaces clsx + tailwind-merge; shadcn components import it
 * directly, and app code imports it from here.
 */
export { cn } from 'cn'
