import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'

const ENDPOINT = 'https://api.web3forms.com/submit'
const FALLBACK_EMAIL = 'hi.manueltito@gmail.com'
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FieldName = 'name' | 'email' | 'message'
type Status = 'idle' | 'sending' | 'sent' | 'failed'

const FIELDS: Array<{
  name: FieldName
  label: string
  type?: string
  autoComplete: string
  multiline?: boolean
}> = [
  { name: 'name', label: 'Name', type: 'text', autoComplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { name: 'message', label: 'What can I help with?', autoComplete: 'off', multiline: true },
]

const EMPTY: Record<FieldName, string> = { name: '', email: '', message: '' }

function validate(values: Record<FieldName, string>) {
  const errors: Partial<Record<FieldName, string>> = {}
  if (!values.name.trim()) errors.name = 'Please enter your name.'
  if (!values.email.trim()) errors.email = 'Please enter your email.'
  else if (!EMAIL_SHAPE.test(values.email.trim())) errors.email = 'That email doesn’t look right.'
  if (!values.message.trim()) errors.message = 'Please tell me what you need.'
  return errors
}

/**
 * Contact form. Messages go through Web3Forms, which delivers them to the
 * inbox its access key is registered to. The key comes from
 * VITE_WEB3FORMS_KEY (see .env.example); without one the form still renders
 * and a submit shows the failure message.
 */
export default function ContactForm() {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const [status, setStatus] = useState<Status>('idle')
  const formRef = useRef<HTMLFormElement>(null)
  const request = useRef<AbortController | null>(null)

  useEffect(() => () => request.current?.abort(), [])

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const name = e.target.name as FieldName
    setValues((current) => ({ ...current, [name]: e.target.value }))
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }))
    if (status === 'sent' || status === 'failed') setStatus('idle')
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (status === 'sending') return

    const found = validate(values)
    setErrors(found)
    const firstInvalid = FIELDS.find((field) => found[field.name])
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid.name}"]`)?.focus()
      return
    }

    const key = import.meta.env.VITE_WEB3FORMS_KEY
    if (!key) {
      setStatus('failed')
      return
    }

    setStatus('sending')
    request.current = new AbortController()
    // spam trap: people never see this checkbox, so only a bot ticks it
    const botcheck = new FormData(e.currentTarget).get('botcheck')

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: key,
          name: values.name.trim(),
          email: values.email.trim(),
          message: values.message.trim(),
          subject: 'New message from manueltito portfolio',
          from_name: 'Portfolio contact form',
          replyto: values.email.trim(),
          ...(botcheck ? { botcheck: true } : {}),
        }),
        signal: request.current.signal,
      })
      const result = (await response.json().catch(() => null)) as { success?: boolean } | null

      if (response.ok && result?.success) {
        setStatus('sent')
        setValues(EMPTY)
      } else {
        setStatus('failed')
      }
    } catch (error) {
      // leaving the page mid-request is not a failure to report
      if ((error as Error).name !== 'AbortError') setStatus('failed')
    }
  }

  const buttonText =
    status === 'sending'
      ? 'Sending...'
      : status === 'sent'
        ? 'Message sent. Thank you.'
        : 'Send message'

  return (
    <form
      ref={formRef}
      className="contact__form"
      aria-label="Send me a message"
      noValidate
      onSubmit={onSubmit}
      data-contact-form
    >
      {FIELDS.map((field) => {
        const id = `contact-${field.name}`
        const error = errors[field.name]
        const shared = {
          id,
          name: field.name,
          value: values[field.name],
          onChange,
          required: true,
          autoComplete: field.autoComplete,
          'aria-invalid': error ? true : undefined,
          'aria-describedby': error ? `${id}-error` : undefined,
        }

        return (
          <div
            key={field.name}
            className="contact__field"
            data-invalid={error ? true : undefined}
            data-contact-field
          >
            <label htmlFor={id}>{field.label}</label>
            {field.multiline ? (
              <textarea {...shared} rows={4} />
            ) : (
              <input {...shared} type={field.type} />
            )}
            <span className="contact__line" aria-hidden="true" data-contact-line />
            <p className="contact__error" id={`${id}-error`}>
              {error}
            </p>
          </div>
        )
      })}

      {/* honeypot for Web3Forms: hidden from people, ignored by assistive tech */}
      <input
        type="checkbox"
        name="botcheck"
        className="contact__botcheck"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <div className="contact__submit-field" data-contact-submit data-magnetic-field>
        <button
          type="submit"
          className="contact__submit"
          disabled={status === 'sending'}
          data-magnetic
        >
          {buttonText}
        </button>
      </div>

      {status === 'failed' && (
        <p className="contact__failure">
          Couldn&rsquo;t send. Please email me at{' '}
          <a href={`mailto:${FALLBACK_EMAIL}`}>{FALLBACK_EMAIL}</a>
        </p>
      )}

      {/* results are announced here; what is visible is the button and the line above */}
      <p className="visually-hidden" role="status" aria-live="polite">
        {status === 'sent' && 'Message sent. Thank you.'}
        {status === 'failed' && `Couldn’t send. Please email me at ${FALLBACK_EMAIL}`}
      </p>
    </form>
  )
}
