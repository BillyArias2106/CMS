'use client'

import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Send } from 'lucide-react'

import { getUIText, type Locale } from '@/lib/i18n'

type ContactFormFields = {
  email: string
  firstName: string
  lastName: string
  message: string
  phone: string
  subject: string
}

type ContactFormResponse = {
  errors?: Partial<Record<keyof ContactFormFields, string>>
  message?: string
  ok?: boolean
  warning?: string
}

const initialForm: ContactFormFields = {
  email: '',
  firstName: '',
  lastName: '',
  message: '',
  phone: '',
  subject: ''
}

type ContactFormProps = {
  locale: Locale
}

export function ContactForm({ locale }: ContactFormProps) {
  const text = getUIText(locale)
  const [form, setForm] = useState<ContactFormFields>(initialForm)
  const [errors, setErrors] = useState<
    Partial<Record<keyof ContactFormFields, string>>
  >({})
  const [status, setStatus] = useState<'error' | 'idle' | 'success'>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateField =
    (field: keyof ContactFormFields) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((currentForm) => ({
        ...currentForm,
        [field]: event.target.value
      }))
      setErrors((currentErrors) => ({
        ...currentErrors,
        [field]: undefined
      }))
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setStatus('idle')
    setStatusMessage('')

    try {
      const response = await fetch('/api/contact', {
        body: JSON.stringify({
          ...form,
          locale
        }),
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST'
      })
      const data = (await response.json()) as ContactFormResponse

      if (!response.ok || data.ok === false) {
        setErrors(data.errors ?? {})
        setStatus('error')
        setStatusMessage(data.message ?? text.contact.submitReview)
        return
      }

      setForm(initialForm)
      setErrors({})
      setStatus('success')
      setStatusMessage(data.warning ?? text.contact.submitSuccess)
    } catch {
      setStatus('error')
      setStatusMessage(text.contact.submitError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      className="grid max-w-full gap-4 rounded-[18px] bg-white p-4 shadow-[0_24px_70px_rgba(9,18,52,0.08)] sm:gap-5 sm:p-8"
      onSubmit={handleSubmit}
    >
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-5">
        <label className="block min-w-0">
          <span className="sr-only">{text.contact.firstName}</span>
          <input
            autoComplete="given-name"
            className="h-12 w-full rounded-md border border-[#8daaff] bg-[#f0f4ff] px-4 text-sm font-medium text-[#07164b] outline-none transition placeholder:text-[#1a3170] focus:border-[#27337e] focus:bg-white"
            name="firstName"
            onChange={updateField('firstName')}
            placeholder={text.contact.firstName}
            value={form.firstName}
          />
          {errors.firstName ? (
            <span className="mt-2 block text-xs font-semibold text-red-600">
              {errors.firstName}
            </span>
          ) : null}
        </label>
        <label className="block min-w-0">
          <span className="sr-only">{text.contact.lastName}</span>
          <input
            autoComplete="family-name"
            className="h-12 w-full rounded-md border border-[#8daaff] bg-[#f0f4ff] px-4 text-sm font-medium text-[#07164b] outline-none transition placeholder:text-[#1a3170] focus:border-[#27337e] focus:bg-white"
            name="lastName"
            onChange={updateField('lastName')}
            placeholder={text.contact.lastName}
            value={form.lastName}
          />
        </label>
      </div>

      <label className="block min-w-0">
        <span className="sr-only">{text.contact.phone}</span>
        <input
          autoComplete="tel"
          className="h-12 w-full rounded-md border border-[#8daaff] bg-[#f0f4ff] px-4 text-sm font-medium text-[#07164b] outline-none transition placeholder:text-[#1a3170] focus:border-[#27337e] focus:bg-white lg:w-3/5"
          name="phone"
          onChange={updateField('phone')}
          placeholder={text.contact.phone}
          value={form.phone}
        />
        {errors.phone ? (
          <span className="mt-2 block text-xs font-semibold text-red-600">
            {errors.phone}
          </span>
        ) : null}
      </label>

      <label className="block min-w-0">
        <span className="sr-only">{text.contact.email}</span>
        <input
          autoComplete="email"
          className="h-12 w-full rounded-md border border-[#8daaff] bg-[#f0f4ff] px-4 text-sm font-medium text-[#07164b] outline-none transition placeholder:text-[#1a3170] focus:border-[#27337e] focus:bg-white"
          name="email"
          onChange={updateField('email')}
          placeholder={text.contact.email}
          type="email"
          value={form.email}
        />
        {errors.email ? (
          <span className="mt-2 block text-xs font-semibold text-red-600">
            {errors.email}
          </span>
        ) : null}
      </label>

      <label className="block min-w-0">
        <span className="sr-only">{text.contact.subject}</span>
        <input
          className="h-12 w-full rounded-md border border-[#8daaff] bg-[#f0f4ff] px-4 text-sm font-medium text-[#07164b] outline-none transition placeholder:text-[#1a3170] focus:border-[#27337e] focus:bg-white lg:w-3/5"
          name="subject"
          onChange={updateField('subject')}
          placeholder={text.contact.subject}
          value={form.subject}
        />
        {errors.subject ? (
          <span className="mt-2 block text-xs font-semibold text-red-600">
            {errors.subject}
          </span>
        ) : null}
      </label>

      <label className="block min-w-0">
        <span className="sr-only">{text.contact.message}</span>
        <textarea
          className="min-h-32 w-full resize-y rounded-md border border-[#8daaff] bg-[#f0f4ff] px-4 py-4 text-sm font-medium text-[#07164b] outline-none transition placeholder:text-[#1a3170] focus:border-[#27337e] focus:bg-white"
          name="message"
          onChange={updateField('message')}
          placeholder={text.contact.message}
          value={form.message}
        />
        {errors.message ? (
          <span className="mt-2 block text-xs font-semibold text-red-600">
            {errors.message}
          </span>
        ) : null}
      </label>

      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
        <button
          className="inline-flex min-h-12 w-full max-w-full items-center justify-center gap-2 rounded-md bg-[#27337e] px-5 py-3 text-center font-heading text-sm font-bold leading-tight text-white transition hover:bg-[#16205f] disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit sm:px-7"
          disabled={isSubmitting}
          type="submit"
        >
          <Send aria-hidden="true" size={17} strokeWidth={1.8} />
          {isSubmitting ? text.contact.sending : text.contact.send}
        </button>
        {statusMessage ? (
          <p
            className={`text-sm font-semibold ${
              status === 'success' ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {statusMessage}
          </p>
        ) : null}
      </div>
    </form>
  )
}
