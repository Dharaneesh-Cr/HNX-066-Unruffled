import { useRef, useState, type FormEvent, type RefObject } from 'react'
import { ImagePlus, ShieldCheck, Trash2, Upload } from 'lucide-react'
import type {
  AffectedPersonCreateInput,
  MissingCaseCreateInput,
  RegistrationInput,
  RegistrationProfileInput,
} from '../../types'
import './PersonRegistrationForm.css'

type FormKind = 'missing' | 'affected'
interface PersonRegistrationFormProps {
  kind: FormKind
  onSubmit: (record: RegistrationInput) => Promise<void>
}

const photoTypes = 'image/jpeg,image/png,image/webp'
const maxPhotoBytes = 1_500_000

function readPhoto(file?: File) {
  if (!file || (file.size === 0 && !file.name)) return Promise.resolve(undefined)
  if (file.size === 0) {
    return Promise.reject(new Error('The selected image is empty.'))
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return Promise.reject(new Error('Choose a JPEG, PNG, or WebP image.'))
  }
  if (file.size > maxPhotoBytes) {
    return Promise.reject(new Error('Each image must be 1.5 MB or smaller.'))
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('The selected image could not be previewed.'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('The selected image could not be read.'))
    reader.readAsDataURL(file)
  })
}

function value(form: FormData, name: string) {
  const fieldValue = String(form.get(name) ?? '').trim()
  return fieldValue || undefined
}

function numberValue(form: FormData, name: string) {
  const raw = value(form, name)
  if (!raw) return undefined
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : undefined
}

function TextField({
  name,
  label,
  type = 'text',
  required = false,
  optional = false,
  placeholder,
  min,
  max,
}: {
  name: string
  label: string
  type?: string
  required?: boolean
  optional?: boolean
  placeholder?: string
  min?: string
  max?: string
}) {
  return (
    <label className="person-field">
      <span className="person-field-label">
        {label}{required && <b aria-hidden="true"> *</b>}
        {optional && <span className="person-optional-label">Optional</span>}
      </span>
      <input
        autoComplete="off"
        max={max}
        min={min}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  )
}

function TextAreaField({
  name,
  label,
  optional = false,
  rows = 3,
  placeholder,
}: {
  name: string
  label: string
  optional?: boolean
  rows?: number
  placeholder?: string
}) {
  return (
    <label className="person-field person-field-wide">
      <span className="person-field-label">
        {label}{optional && <span className="person-optional-label">Optional</span>}
      </span>
      <textarea name={name} placeholder={placeholder} rows={rows} />
    </label>
  )
}

function SelectField({
  name,
  label,
  options,
  required = false,
}: {
  name: string
  label: string
  options: string[]
  required?: boolean
}) {
  return (
    <label className="person-field">
      <span>{label}{required && <b aria-hidden="true"> *</b>}</span>
      <select defaultValue="" name={name} required={required}>
        <option value="">Select an option</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function PhotoField({
  label,
  name,
  preview,
  onChange,
  onClear,
  inputRef,
}: {
  label: string
  name: string
  preview?: string
  onChange: (file?: File) => void
  onClear: () => void
  inputRef: RefObject<HTMLInputElement | null>
}) {
  return (
    <div className="person-photo-control">
      <label className="person-field">
        <span>{label}</span>
        <span className="person-file-input">
          <Upload size={16} aria-hidden="true" />
          <span>Select image</span>
          <input
            accept={photoTypes}
            aria-label={label}
            name={name}
            onChange={(event) => onChange(event.currentTarget.files?.[0])}
            ref={inputRef}
            type="file"
          />
        </span>
      </label>
      {preview && (
        <div className="photo-preview">
          <img alt={`${label} preview`} src={preview} />
          <button className="photo-clear-button" onClick={onClear} type="button">
            <Trash2 size={14} aria-hidden="true" /> Clear photo
          </button>
        </div>
      )}
    </div>
  )
}

export default function PersonRegistrationForm({
  kind,
  onSubmit,
}: PersonRegistrationFormProps) {
  const isMissing = kind === 'missing'
  const [primaryPhoto, setPrimaryPhoto] = useState<string>()
  const [photoError, setPhotoError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const primaryPhotoInput = useRef<HTMLInputElement>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    if (!formElement.reportValidity()) return
    setSubmitting(true)
    setPhotoError('')
    setSubmitError('')

    try {
      const form = new FormData(formElement)
      const photoFile = form.get('photo')
      if (photoFile instanceof File && photoFile.size > 0) {
        await readPhoto(photoFile)
      }
      const profile: RegistrationProfileInput = {
        fullName: value(form, 'fullName'),
        alias: value(form, 'alias'),
        age: numberValue(form, 'age'),
        gender: value(form, 'gender'),
        distinguishingMarks: value(form, 'distinguishingMarks'),
        clothingDescription: value(form, 'clothingDescription'),
        additionalDescription: value(form, 'additionalDescription'),
      }

      if (isMissing) {
        const record: MissingCaseCreateInput = {
          profile,
          reporterName: value(form, 'reporterName') ?? '',
          relationship: value(form, 'relationship') ?? '',
          reporterEmail: value(form, 'reporterEmail') ?? '',
          reporterPhone: value(form, 'reporterPhone') ?? '',
          preferredContactMethod: 'Phone',
          consented: form.get('consent') === 'on',
          lastSeenDate: value(form, 'lastSeenDate') ?? '',
          lastSeenTime: value(form, 'lastSeenTime'),
          lastSeenLocation: value(form, 'lastSeenLocation') ?? '',
          photoFile: photoFile instanceof File && photoFile.size > 0 ? photoFile : undefined,
        }
        await onSubmit(record)
      } else {
        const record: AffectedPersonCreateInput = {
          profile,
          facilityName: value(form, 'facilityName'),
          foundDate: value(form, 'foundDate') ?? '',
          foundTime: value(form, 'foundTime'),
          foundLocation: value(form, 'foundLocation') ?? '',
          currentLocation: value(form, 'foundLocation') ?? '',
          conditionStatus: value(form, 'conditionStatus') ?? '',
          foundBy: value(form, 'foundBy') ?? '',
          medicalConditionSummary: value(form, 'medicalConditionSummary'),
          medicationInformation: value(form, 'medicationInformation'),
          immediateCareRequired: value(form, 'immediateCareRequired'),
          accessibilityNeeds: value(form, 'accessibilityNeeds'),
          consented: form.get('consent') === 'on',
          photoFile: photoFile instanceof File && photoFile.size > 0 ? photoFile : undefined,
        }
        await onSubmit(record)
      }
      formElement.reset()
      setPrimaryPhoto(undefined)
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Choose a ')) {
        setPhotoError(error.message)
      } else if (error instanceof Error && error.message.startsWith('The selected image')) {
        setPhotoError(error.message)
      } else if (error instanceof Error) {
        setSubmitError(error.message)
      } else {
        console.error('Unable to process the registration form.', error)
        setSubmitError('The report could not be submitted. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function previewFile(file: File | undefined, update: (data?: string) => void) {
    if (!file) {
      update(undefined)
      return
    }
    setPhotoError('')
    try {
      update(await readPhoto(file))
    } catch (error) {
      update(undefined)
      setPhotoError(error instanceof Error ? error.message : 'The image could not be previewed.')
    }
  }

  return (
    <form className="person-registration-form" onSubmit={handleSubmit}>
      <section className="person-form-section" aria-labelledby="photo-section-title">
        <div className="person-section-heading">
          <span className="person-section-number">01</span>
          <div><h2 id="photo-section-title">Photo</h2><p>Use a clear recent photo when available.</p></div>
        </div>
        <div className="person-photo-grid">
          <PhotoField
            label="Person photo"
            name="photo"
            inputRef={primaryPhotoInput}
            onChange={(file) => void previewFile(file, setPrimaryPhoto)}
            onClear={() => {
              setPrimaryPhoto(undefined)
              setPhotoError('')
              if (primaryPhotoInput.current) primaryPhotoInput.current.value = ''
            }}
            preview={primaryPhoto}
          />
        </div>
        <p className="person-field-hint"><ImagePlus size={15} /> Selected photos are uploaded to private storage when you submit the record.</p>
        {photoError && <p className="person-form-error" role="alert">{photoError}</p>}
      </section>

      <section className="person-form-section" aria-labelledby="basic-section-title">
        <div className="person-section-heading">
          <span className="person-section-number">02</span>
          <div><h2 id="basic-section-title">Basic Information</h2><p>Share what is known. Use approximate values if needed.</p></div>
        </div>
        <div className="person-fields-grid">
          <TextField name="fullName" label="Full Name" required={isMissing} optional={!isMissing} />
          <TextField name="alias" label="Nickname / Other Name" optional />
          <TextField name="age" label="Approximate Age" type="number" min="0" max="125" required />
          <SelectField name="gender" label="Gender" required options={['Female', 'Male', 'Non-binary', 'Unknown / not recorded']} />
        </div>
      </section>

      {isMissing ? (
        <section className="person-form-section" aria-labelledby="last-seen-section-title">
          <div className="person-section-heading">
            <span className="person-section-number">03</span>
            <div><h2 id="last-seen-section-title">Last Seen Information</h2><p>Where and when was the person last seen?</p></div>
          </div>
          <div className="person-fields-grid">
            <TextField name="lastSeenDate" label="Last seen date" type="date" required />
            <TextField name="lastSeenTime" label="Last seen time" type="time" />
            <TextField name="lastSeenLocation" label="Last seen location" required placeholder="City, region, or landmark" />
          </div>
        </section>
      ) : (
        <section className="person-form-section" aria-labelledby="found-section-title">
          <div className="person-section-heading">
            <span className="person-section-number">03</span>
            <div><h2 id="found-section-title">Found Information</h2><p>Where and when was the person found?</p></div>
          </div>
          <div className="person-fields-grid">
            <TextField name="foundDate" label="Date found" type="date" required />
            <TextField name="foundTime" label="Time found" type="time" />
            <TextField name="foundLocation" label="Location found" required placeholder="City, region, or landmark" />
            <SelectField name="conditionStatus" label="Condition / status" required options={['Safe at facility', 'Receiving care', 'Needs family contact', 'Searching for family', 'Other']} />
            <TextField name="foundBy" label="Staff / responder name" required />
          </div>
        </section>
      )}

      <section className="person-form-section" aria-labelledby="additional-description-section-title">
        <div className="person-section-heading">
          <span className="person-section-number">04</span>
          <div><h2 id="additional-description-section-title">Additional Description</h2><p>Optional details that may help identify this person.</p></div>
        </div>
        <div className="person-fields-grid">
          <TextAreaField
            name="distinguishingMarks"
            label="Distinguishing Marks"
            optional
            placeholder="Describe any scars, birthmarks, tattoos, unique features or other identifying marks."
          />
          <TextAreaField
            name="clothingDescription"
            label="Clothing Description"
            optional
            placeholder="Describe what the person was wearing when last seen/found."
          />
          <TextAreaField
            name="additionalDescription"
            label="Additional Description"
            optional
            placeholder="Add any other useful information that may help identify this person."
          />
        </div>
      </section>

      {!isMissing && (
        <section className="person-form-section" aria-labelledby="medical-section-title">
          <div className="person-section-heading">
            <span className="person-section-number">05</span>
            <div><h2 id="medical-section-title">Medical & Accessibility Information</h2><p>Optional sensitive information for authorized care staff only.</p></div>
          </div>
          <div className="person-fields-grid">
            <TextAreaField name="medicalConditionSummary" label="Medical condition summary" optional />
            <TextAreaField name="medicationInformation" label="Medication information" optional />
            <TextAreaField name="immediateCareRequired" label="Immediate care required" optional />
            <TextAreaField name="accessibilityNeeds" label="Accessibility needs" optional />
          </div>
        </section>
      )}

      {isMissing ? (
        <section className="person-form-section" aria-labelledby="contact-section-title">
          <div className="person-section-heading">
            <span className="person-section-number">05</span>
            <div><h2 id="contact-section-title">Reporter / Contact Details</h2><p>How can the response team contact you?</p></div>
          </div>
          <div className="person-fields-grid">
            <TextField name="reporterName" label="Reporter name" required />
            <TextField name="relationship" label="Relationship to missing person" required />
            <TextField name="reporterEmail" label="Email" type="email" required />
            <TextField name="reporterPhone" label="Phone" type="tel" required />
          </div>
        </section>
      ) : (
        <section className="person-form-section" aria-labelledby="organization-section-title">
          <div className="person-section-heading">
            <span className="person-section-number">06</span>
            <div><h2 id="organization-section-title">Facility Information</h2><p>Your authorized organization is taken from your verified account.</p></div>
          </div>
          <div className="person-fields-grid">
            <TextField name="facilityName" label="Facility (optional)" />
          </div>
        </section>
      )}

      <section className="person-form-section person-privacy-section" aria-labelledby="privacy-section-title">
        <div className="person-section-heading">
          <span className="person-section-number">{isMissing ? '06' : '07'}</span>
          <div><h2 id="privacy-section-title">{isMissing ? 'Privacy & Consent' : 'Privacy / Authorization'}</h2><p>Review how these submitted details will be handled.</p></div>
        </div>
        <p className="person-privacy-copy">
          {isMissing
            ? 'Your information is submitted to the Sahayaa service for authorized response teams.'
            : 'This record is submitted to the Sahayaa service for your authorized organization. Sensitive care details are restricted to authorized roles.'}
        </p>
        <label className="person-consent">
          <input name="consent" required type="checkbox" />
          <span><b aria-hidden="true">* </b>{isMissing
            ? 'I confirm that I am authorized to submit this missing-person report.'
            : 'I confirm that I am authorized to register this affected-person record.'}</span>
        </label>
      </section>

      {submitError && <p className="person-form-error" role="alert">{submitError}</p>}
      <div className="person-form-actions">
        <button className="button button-primary" disabled={submitting} type="submit">
          {submitting ? 'Submitting…' : isMissing ? 'Submit Missing Person Report' : 'Register Affected Person'}
        </button>
        <span><ShieldCheck size={15} /> Submitted to the Sahayaa API.</span>
      </div>
    </form>
  )
}
