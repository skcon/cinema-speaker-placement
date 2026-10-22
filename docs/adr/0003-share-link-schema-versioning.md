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

## Amendment (1.1.0): one schema version per release cycle

"Released" means tagged: only `vX.Y.Z` tags deploy, so no user ever gets a link from a version that was never tagged. Version 1 shipped in v1.0.0 and is frozen in `src/domain/config-v1.ts`. The first config change of the 1.1.0 cycle added version 2 with the v1 → v2 migration, and **all 1.1.0 config changes extend schema version 2 until v1.1.0 is tagged**: a later 1.1.0 change adds its fields to version 2, gives them their value in the v1 → v2 migration and regenerates the version 2 fixtures, instead of bumping the version again. Each release cycle that changes the config works the same way, with one new version per release.

- Every version, including one that is never released, still has to keep the versions released before it opening. The frozen version 1 fixtures stay as v1.0.0 wrote them.
- A frozen schema imports nothing but zod (an ESLint rule checks this). It holds copies of the room limits, layout list, channel ids and placement rules as they were at its release, so later changes to the live code can't change which old links it accepts.
- A development build between releases can write a version 2 link that a later development build no longer opens. Only tagged releases make that promise, so this is accepted.

## Amendment (1.1.0): short field names in version 2 links

The worst-case link grew past the URL budget once 1.1.0 added room objects (eight furniture boxes, and openings to come): the config's own field names (`"speakerGroups"`, `"driverDiameter"`, repeated for every object) cost about a quarter of the link, which lz-string compresses poorly. From version 2 on, a link's config spells every field name short (`"room"` is `"r"`, `"width"` is `"w"`), from the table `SHORT_FIELD_NAMES` in `src/domain/share-link.ts`. Values, and record keys such as channel ids, stay as they are, so every number still comes back to its last digit.

- The table is part of the wire format: a short name is never changed or reused, only added for a new field. Each short name is used once and is never a field name, so a link can always be spelled out again.
- Decoding spells the names out before the migrations and the strict schema check. A version 2 link with a field name spelled out was not written by the app, so it is unreadable, as any other hand-edited link.
- Version 1 links keep their spelled-out names: the frozen fixtures stay byte-identical.
- Considered: rounding the speaker specs in the link (it drops digits a user typed, which the codec tests rule out), and a fixed tuple layout per object (shorter still, but every field becomes a position to keep in step). Short names keep the config's shape and save about 400 characters on the worst case.

## Amendment (1.1.0): openings packed as tuples in version 2 links

Even with short field names, six doors and windows written as objects would cost about 285 characters, and the worst-case link with eight furniture boxes had only about 160 left (ADR 0006). So a version 2 link writes each opening (`roomObjects.openings`) as a tuple of whole numbers instead of an object (#57):

    door:   [code, position, width]
    window: [code, position, width, sill, height]

`code` folds the kind and the wall into one digit (`OPENING_WIRE_CODES` in `src/domain/share-link.ts`: doors 0–3 and windows 4–7 on the front, right, back and left walls), and every length is in whole millimeters, the precision a link stores them in anyway. The worst-case link with eight furniture boxes and six openings is 1,978 of 2,000 characters, without changing ADR 0006's limits.

- The codes and the order of the fields are part of the wire format: never change or reuse a code or a place, only add one.
- Decoding unpacks the tuples after spelling the field names out, before the migrations and the strict schema check. Anything else where a tuple belongs (an object, an unknown code, a fraction of a millimeter, the wrong number of fields) makes the link unreadable, as any other hand-edited link.
- The config itself keeps its readable shape (`{ kind, wall, position, width, ... }`); only the link packs it.
- Considered: rounding openings to the centimeter (it would change a typed imperial size by more than the 0.1 in the app shows) and packing every room object this way (it saves more, but the earlier amendment's reasons for keeping the config's shape still hold where the budget allows it).

## Amendment (after 1.2.0): version 2 frozen, one table entry per version

Version 2 shipped in v1.1.0 and v1.2.0 writes it too, but until now only version 1 had a frozen copy: version 2 links were checked by the live `configSchema`, whose room-object rules read limits from `reference.ts` and five kind modules. Tightening one of those limits would quietly have stopped released links from opening (#102). The amendment above only required the freeze at the next config change; we froze it early, while the rules are fresh.

- `src/domain/config-v2.ts` holds version 2 as v1.2.0 checks it, imports nothing but zod (the same ESLint rule as `config-v1.ts`) and repeats each fit check in the same floating-point order as the live code, since a limit at a wall is a sum that can round differently in another order. v1.1.0 added some of those sums up in another order, so on a few edges a micrometer wide it decided otherwise; we keep v1.2.0's answers, which is what released links have opened with since.
- What a version means lives in one entry of `CONFIG_VERSIONS` (`src/domain/share-link.ts`): its frozen schema, its wire form (the lengths it stores to the millimeter, its short field names, the part it packs) and its migration up. The codec walks the table: a link is checked against its own version's frozen schema, migrated up through every later version's schema, and last held to the live `configSchema`. While version 2 is current, `configSchema` must accept exactly what `configSchemaV2` does; the codec tests pin version 2's edges through both.
- Every version in the table is released. The next config change adds version 3 (copy `configSchema` into `config-v3.ts`, give version 2 its migration up, add the version 3 entry), and later changes in that release cycle extend version 3 in place until it is tagged, as the first 1.1.0 amendment says.
- Considered: keeping version 2 live until the next config change, as the ADR allowed. Rejected because a change to a limit in `reference.ts` is easy to make without seeing that it is a schema change.

## Amendment (1.3.1): version 3 adds Speakers follow the seat (#123)

Version 2 is the last version released (v1.1.0 to v1.3.0 write it). The first config change of the 1.3.1 cycle, Speakers follow the seat (ADR 0005, amendment for #123), adds **version 3**, as the amendment above says:

- `src/domain/config-v3.ts` is `configSchemaV3`: version 2 plus `speakersInstalledFor`, null while the speakers follow the seat, else a point `{ x, y, z }` that must be where the MLP may be (the MLP's wall clearances, at ear height), with a manual position's half-millimeter slack. It imports nothing but zod, like the others. Later 1.3.1 config changes extend it in place until v1.3.1 is tagged.
- Version 2 gets its migration up: `speakersInstalledFor: null`, so every version 1 and 2 link opens with the toggle on, which is how those versions placed the speakers: every position stays as it was. The version 1 and 2 fixtures are untouched; new `V3_LINKS` fixtures add the imperial room, the same room with the speakers held while the MLP moved, and the two edge rooms with the stored seat in other corners of the MLP's clearance lines.
- Its wire form keeps version 2's short names and packed openings, and adds a table of its own, `V3_SHORT_FIELD_NAMES` (`speakersInstalledFor` is `"si"`), and a millimeter table of its own: `LINK_MILLIMETER_LENGTHS` is now version 3's (version 2's plus the stored seat, stored to the millimeter like a manual position), and version 2 keeps `V2_MILLIMETER_LENGTHS`.
- The worst-case link, now with the stored seat at its longest, is 1,994 of 2,000 characters. The next field that grows the worst case will need to save room elsewhere (for example by packing manual positions as the openings are).
- Considered: two fields, a `speakersFollowSeat` flag and the stored seat. Rejected: one nullable field can't say "off" without a seat or "on" with a stale one, and it costs fewer characters. The domain still reads it as a flag (`speakersFollowSeat`).
