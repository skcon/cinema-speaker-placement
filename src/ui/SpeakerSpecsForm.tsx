import { useId } from 'react'
import {
  checkAmplifierWatts,
  checkSensitivity,
  DEFAULT_AMPLIFIER_WATTS,
  DEFAULT_SPEAKER_SPECS,
  DEFAULT_SUBWOOFER_SPECS,
  ENCLOSURES,
  formatInches,
  SPEAKER_GROUP_NAMES,
  SPEAKER_TYPES,
  speakerGroupsIn,
  SUBWOOFER_SPEC_FIELDS,
  subwooferIds,
  SUBWOOFERS,
  withAmplifierWatts,
  withSpeakerSpecs,
  withSubwooferHasOwnSpecs,
  withSubwooferSpecs,
  type Enclosure,
  type SpeakerGroupId,
  type SpeakerType,
  type SubwooferId,
  type SubwooferSpecs,
} from '@/domain'
import { useConfig } from '@/state/config-context'
import { Input } from '@/ui/components/input'
import { Label } from '@/ui/components/label'
import { RadioGroup, RadioGroupItem } from '@/ui/components/radio-group'
import { NumberField } from '@/ui/NumberField'
import { rangeErrorMessage } from '@/ui/lib/range-error'
import {
  acceptedSpecs,
  formatWatts,
  SUBWOOFER_SPEC_TEXT,
  SUBWOOFER_SPECS_TEXT,
  subwooferSpecErrorMessage,
  subwooferSpecProblems,
} from '@/ui/lib/subwoofer-specs'
import { useDraftField } from '@/ui/lib/use-draft-field'

const ENCLOSURE_LABELS = {
  sealed: 'Sealed',
  ported: 'Ported',
} as const satisfies Record<Enclosure, string>

const SPEAKER_TYPE_LABELS = {
  bookshelf: 'Bookshelf',
  tower: 'Tower',
} as const satisfies Record<SpeakerType, string>

/**
 * Specs per speaker group (GLOSSARY.md), for the groups the layout uses,
 * the amplifier power per channel, and the Subwoofers group with optional
 * specs per subwoofer.
 */
export function SpeakerSpecsForm() {
  const layout = useConfig((state) => state.config.layout)
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">{SPEAKER_GROUPS_NOTE}</p>
      {speakerGroupsIn(layout).map((group) => (
        <SpeakerGroupSpecs key={group} group={group} />
      ))}
      <AmplifierPowerField />
      <SubwooferGroupSpecs />
      <OwnSubwooferSpecs />
    </div>
  )
}

/** What the speaker group specs mean, written from the defaults themselves. */
const SPEAKER_GROUPS_NOTE = (() => {
  const { type, sensitivity } = DEFAULT_SPEAKER_SPECS
  return (
    'One speaker model per group. Sensitivity is dB SPL at 1 m with 1 W. ' +
    'A bookshelf goes on a stand and a tower on the floor, both with the ' +
    'tweeter at seated ear height; a tower’s woofer sits lower, which ' +
    `changes its floor reflection. Starting values are ours: a ${sensitivity} dB ` +
    `${SPEAKER_TYPE_LABELS[type].toLowerCase()} speaker and ` +
    `${formatWatts(DEFAULT_AMPLIFIER_WATTS)} per channel, typical of home ` +
    'theater gear, not a measured product.'
  )
})()

const sensitivityError = rangeErrorMessage(
  'sensitivity',
  'Sensitivity',
  (db) => `${db} dB`,
)

const amplifierWattsError = rangeErrorMessage(
  'amplifier power',
  'Amplifier power',
  formatWatts,
)

/** One speaker group's specs: bookshelf or tower (not for overheads), and sensitivity. */
function SpeakerGroupSpecs({ group }: { group: SpeakerGroupId }) {
  const specs = useConfig((state) => state.config.speakerGroups[group].specs)
  const applyEdit = useConfig((state) => state.applyEdit)
  const typeLabelId = useId()
  const idPrefix = useId()

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1.5 text-sm font-medium">
        {SPEAKER_GROUP_NAMES[group]}
      </legend>
      {'type' in specs && (
        <div className="flex flex-col gap-2">
          <span id={typeLabelId} className="text-sm font-medium">
            Type
          </span>
          <RadioGroup
            aria-labelledby={typeLabelId}
            value={specs.type}
            onValueChange={(value) => {
              const type = SPEAKER_TYPES.find((t) => t === value)
              if (!type) return
              applyEdit((config) => withSpeakerSpecs(config, group, { type }))
            }}
            className="flex flex-wrap gap-x-4 gap-y-2"
          >
            {SPEAKER_TYPES.map((type) => (
              <div key={type} className="flex items-center gap-2">
                <RadioGroupItem value={type} id={`${idPrefix}-${type}`} />
                <Label htmlFor={`${idPrefix}-${type}`} className="font-normal">
                  {SPEAKER_TYPE_LABELS[type]}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}
      <NumberField
        label="Sensitivity (dB)"
        value={specs.sensitivity}
        check={checkSensitivity}
        onValid={(sensitivity) =>
          applyEdit((config) =>
            withSpeakerSpecs(config, group, { sensitivity }),
          )
        }
        errorMessage={sensitivityError}
      />
    </fieldset>
  )
}

/** The one amplifier power every Speaker gets (user story 16). */
function AmplifierPowerField() {
  const watts = useConfig((state) => state.config.amplifierWatts)
  const applyEdit = useConfig((state) => state.applyEdit)
  return (
    <NumberField
      label="Amplifier power per channel (W)"
      value={watts}
      check={checkAmplifierWatts}
      onValid={(valid) =>
        applyEdit((config) => withAmplifierWatts(config, valid))
      }
      errorMessage={amplifierWattsError}
      note="Your receiver's or amplifier's rated power per channel, for the headroom check."
    />
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
        {DEFAULTS_NOTE} The enclosure shapes the estimated bass roll-off; driver
        size, enclosure and RMS power give a very rough headroom check.
      </p>
    </fieldset>
  )
}

/** Says where the starting specs come from, written from the defaults themselves. */
const DEFAULTS_NOTE = (() => {
  const { enclosure, driverDiameter, rmsWatts, peakWatts } =
    DEFAULT_SUBWOOFER_SPECS
  return (
    `Starting values are ours: a ${ENCLOSURE_LABELS[enclosure].toLowerCase()} ` +
    `${formatInches(driverDiameter)} subwoofer with a ${formatWatts(rmsWatts)} ` +
    `RMS (${formatWatts(peakWatts)} peak) amplifier, typical of home theater ` +
    `subwoofers, not a measured product.`
  )
})()

/** A switch per subwoofer for its own specs, with their fields when on. */
function OwnSubwooferSpecs() {
  const count = useConfig((state) => state.config.layout.subwoofers)
  const ownSpecs = useConfig(
    (state) => state.config.speakerGroups.subwoofers.ownSpecs,
  )
  const applyEdit = useConfig((state) => state.applyEdit)
  const idPrefix = useId()

  if (count < 2) {
    return (
      <p className="text-xs text-muted-foreground">
        With two or more subwoofers, each one can have its own specs.
      </p>
    )
  }

  return subwooferIds(count).map((id) => {
    const specs = ownSpecs[id]
    const { name } = SUBWOOFERS[id]
    const checkboxId = `${idPrefix}-${id}`
    return (
      <div key={id} className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <input
            id={checkboxId}
            type="checkbox"
            checked={specs !== undefined}
            onChange={(event) => {
              const hasOwnSpecs = event.target.checked
              applyEdit((config) =>
                withSubwooferHasOwnSpecs(config, id, hasOwnSpecs),
              )
            }}
            className="size-4 accent-primary"
          />
          <Label htmlFor={checkboxId} className="font-normal">
            {name} has its own specs
          </Label>
        </div>
        {specs && (
          <fieldset className="flex flex-col gap-3 border-l-2 pl-3">
            <legend className="mb-1.5 text-sm font-medium">{name}</legend>
            <SubwooferSpecsFields target={id} specs={specs} />
          </fieldset>
        )}
      </div>
    )
  })
}

/**
 * One set of subwoofer specs: the enclosure, and the numbers as text (the
 * driver size in inches whatever the units, as drivers are sold by the
 * inch). A valid number goes straight to the store; an invalid one stays
 * in its field with an inline error while the store keeps the last valid
 * specs. Peak and RMS power are checked against each other as typed, so
 * fixing one can make the other valid, and then both are stored. When the
 * stored specs change elsewhere, the fields start over from them
 * (useDraftField).
 */
function SubwooferSpecsFields({
  target,
  specs,
}: {
  target: 'group' | SubwooferId
  specs: SubwooferSpecs
}) {
  const applyEdit = useConfig((state) => state.applyEdit)
  const {
    text: drafts,
    problem: problems,
    edit,
  } = useDraftField({
    value: specs,
    codec: SUBWOOFER_SPECS_TEXT,
    check: subwooferSpecProblems,
    accept: acceptedSpecs,
    onCommit: (accepted) =>
      applyEdit((config) => withSubwooferSpecs(config, target, accepted)),
  })
  const enclosureLabelId = useId()
  const idPrefix = useId()

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
            if (!enclosure) return
            applyEdit((config) =>
              withSubwooferSpecs(config, target, { enclosure }),
            )
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
        const problem = problems?.[field] ?? null
        return (
          <SpecField
            key={field}
            label={`${SUBWOOFER_SPEC_TEXT[field].label} (${SUBWOOFER_SPEC_TEXT[field].unit})`}
            value={drafts[field]}
            onChange={(text) => edit({ ...drafts, [field]: text })}
            error={problem && subwooferSpecErrorMessage(field, problem)}
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
