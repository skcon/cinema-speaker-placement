# Strict, versioned share-link schema; every change after release is a new version

A share link's `config` search param holds the encoded config: lz-string's URL-safe compression of the JSON `{ v, config }`, where `v` is the config schema version. Decoding is strict. A config must match its version's zod schema exactly: every field present, no unknown fields, values in range. Anything else means the link was damaged or changed by hand, so the app shows the default Room with a message (user story 56). Version 1 is whatever ships in the first release that has share links; until then the schema may still change. After that, **every** change to the config schema gets a new version and a migration from the version before, even one that looks additive, such as a new field or a wider range. The old schema is kept as a frozen copy, so links people already shared keep opening (user story 54). An older build that meets a link with a newer version (a stale tab) asks for a reload instead of calling the link broken, and the address keeps the link until the user changes the room, so the reload can still open it.

## Considered Options

- **Lenient schema with per-field defaults** (a missing field takes its default, so additive changes need no version bump): rejected. It quietly turns a truncated or hand-edited link into a different room than the sender's, and it lets schema changes reach users without a migration, against CLAUDE.md's "Schema changes need a migration".
- **Stripping unknown fields**: rejected for the same reason. At a given version the app never writes extra fields, so a link that has them was not written by the app.
- **Bumping the version only for breaking changes**: rejected. An older build would read a new link that uses a new field or a wider range as damaged rather than as newer, and "is this change breaking?" becomes a judgment call made under time pressure.

## Consequences

- `src/domain/share-link.ts` describes the steps for a new version: freeze the old schema, bump `CONFIG_VERSION` and add a migration that validates against the frozen schema. The codec refuses a migrations table with a gap.
- Frozen version 1 links in `src/test/share-link-fixtures.ts`, two of them on the edges of the room ranges, fail a test if a change (such as tightening the room limits) would stop old links from opening.
- A share link has to stay within the URL budget in the codec tests (2,000 characters for the whole production URL), using a worst-case config that grows with the schema.
