/**
 * Not for app code: import `cn` from the `cn` package, as the shadcn
 * components do. This file exists because components.json's `utils` alias
 * points here, so a registry item that still imports the shadcn utils module
 * resolves to the same `cn`.
 */
export { cn } from 'cn'
