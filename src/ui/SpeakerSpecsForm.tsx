import { useId, useState } from 'react'
import {
  checkSubwooferSpec,
  ENCLOSURES,
  SUBWOOFER_COUNTS,
  type Enclosure,
  type SubwooferNumber,
  type SubwooferSpecField,
  type SubwooferSpecs,
} from '@/domain'
import { useConfig } from '@/state/config-context'
import { Input } from '@/ui/components/input'
import { Label } from '@/ui/components/label'
import { RadioGroup, RadioGroupItem } from '@/ui/components/radio-group'
import {
  acceptedSpecs,
  draftsFromSpecs,
  reseedDrafts,
  specsFromDrafts,
  SUBWOOFER_SPEC_FIELDS,
  SUBWOOFER_SPEC_TEXT,
  subwooferSpecErrorMessage,
  type SubwooferSpecDrafts,
} from '@/ui/lib/subwoofer-specs'

const ENCLOSURE_LABELS = {
  sealed: 'Sealed',
  ported: 'Ported',
} as const satisfies Record<Enclosure, string>

/**
 * Specs per speaker group (GLOSSARY.md). Only the Subwoofers group so far,
 * with optional specs per subwoofer; #13 adds the other groups here.
 */
export function SpeakerSpecsForm() {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h3 id={headingId} className="text-sm font-semibold">
        Speaker specs
      </h3>
      <SubwooferGroupSpecs />
      <OwnSubwooferSpecs />
    </section>
  )
}

/** The specs every subwoofer uses unless it has its own. */
function SubwooferGroupSpecs() {
  const specs = useConfig(
    (state) => state.config.speakerGroups.subwoofers.specs,
  )
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1.5 text-sm font-medium">Subwoofers</legend>
      <SubwooferSpecsFields target="group" specs={specs} />
      <p className="text-xs text-muted-foreground">
        Starting values are ours: a typical sealed 12&nbsp;in subwoofer with a
        300&nbsp;W RMS (600&nbsp;W peak) amplifier, not a measured product.
        Specs aren&rsquo;t used in any estimate yet.
      </p>
    </fieldset>
  )
}

/** A switch per subwoofer for specs of its own, with its fields when on. */
function OwnSubwooferSpecs() {
  const overrides = useConfig(
    (state) => state.config.speakerGroups.subwoofers.overrides,
  )
  const setHasOwnSpecs = useConfig((state) => state.setSubwooferHasOwnSpecs)
  const idPrefix = useId()

  if (overrides.length < 2) {
    return (
      <p className="text-xs text-muted-foreground">
        With two or more subwoofers, each one can have specs of its own.
      </p>
    )
  }

  return SUBWOOFER_COUNTS.slice(0, overrides.length).map((number) => {
    const ownSpecs = overrides[number - 1] ?? null
    const checkboxId = `${idPrefix}-${number}`
    return (
      <div key={number} className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <input
            id={checkboxId}
            type="checkbox"
            checked={ownSpecs !== null}
            onChange={(event) => setHasOwnSpecs(number, event.target.checked)}
            className="size-4 accent-primary"
          />
          <Label htmlFor={checkboxId} className="font-normal">
            Subwoofer {number} has its own specs
          </Label>
        </div>
        {ownSpecs && (
          <fieldset className="flex flex-col gap-3 border-l-2 pl-3">
            <legend className="mb-1.5 text-sm font-medium">
              Subwoofer {number}
            </legend>
            <SubwooferSpecsFields target={number} specs={ownSpecs} />
          </fieldset>
        )}
      </div>
    )
  })
}

/**
 * One set of subwoofer specs: the enclosure, and the numbers as text in the
 * chosen units. A valid number goes straight to the store; an invalid one
 * stays in its field with an inline error while the store keeps the last
 * valid specs. Peak and RMS power are checked against each other as typed,
 * so fixing one can make the other valid, and then both are stored. When
 * the stored specs or the units change elsewhere, the fields start over
 * from the stored specs.
 */
function SubwooferSpecsFields({
  target,
  specs,
}: {
  target: 'group' | SubwooferNumber
  specs: SubwooferSpecs
}) {
  const units = useConfig((state) => state.config.units)
  const setSubwooferSpecs = useConfig((state) => state.setSubwooferSpecs)
  const [drafts, setDrafts] = useState(() => draftsFromSpecs(specs, units))
  const [seenInStore, setSeenInStore] = useState({ specs, units })
  const enclosureLabelId = useId()
  const idPrefix = useId()

  // Adjust state while rendering, as RoomDimensionField does.
  if (seenInStore.specs !== specs || seenInStore.units !== units) {
    setSeenInStore({ specs, units })
    setDrafts(
      reseedDrafts(
        drafts,
        seenInStore.specs,
        specs,
        units,
        seenInStore.units !== units,
      ),
    )
  }

  const typed = specsFromDrafts(drafts, specs, units)

  function update(field: SubwooferSpecField, text: string) {
    const next: SubwooferSpecDrafts = { ...drafts, [field]: text }
    setDrafts(next)
    const accepted = acceptedSpecs(specsFromDrafts(next, specs, units), specs)
    if (SUBWOOFER_SPEC_FIELDS.some((f) => accepted[f] !== specs[f])) {
      setSubwooferSpecs(target, accepted)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <span id={enclosureLabelId} className="text-sm font-medium">
          Enclosure
        </span>
        <RadioGroup
          aria-labelledby={enclosureLabelId}
          value={specs.enclosure}
          onValueChange={(value) => {
            const enclosure = ENCLOSURES.find((e) => e === value)
            if (enclosure) setSubwooferSpecs(target, { enclosure })
          }}
          className="flex flex-wrap gap-x-4 gap-y-2"
        >
          {ENCLOSURES.map((enclosure) => (
            <div key={enclosure} className="flex items-center gap-2">
              <RadioGroupItem
                value={enclosure}
                id={`${idPrefix}-${enclosure}`}
              />
              <Label
                htmlFor={`${idPrefix}-${enclosure}`}
                className="font-normal"
              >
                {ENCLOSURE_LABELS[enclosure]}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
      {SUBWOOFER_SPEC_FIELDS.map((field) => {
        const problem = checkSubwooferSpec(typed, field)
        return (
          <SpecField
            key={field}
            label={`${SUBWOOFER_SPEC_TEXT[field].label} (${SUBWOOFER_SPEC_TEXT[field].unit(units)})`}
            value={drafts[field]}
            onChange={(text) => update(field, text)}
            error={problem && subwooferSpecErrorMessage(field, problem, units)}
          />
        )
      })}
    </>
  )
}

/** A labelled number field with its inline error. */
function SpecField({
  label,
  value,
  onChange,
  error,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error: string | null
}) {
  const id = useId()
  const errorId = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error !== null}
        aria-describedby={errorId}
        className="max-w-36"
      />
      <p id={errorId} aria-live="polite" className="text-sm text-destructive">
        {error}
      </p>
    </div>
  )
}
