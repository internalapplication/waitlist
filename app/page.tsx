'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { UserButton, useAuth, useSignIn } from '@clerk/nextjs'
import { CodePanel } from '@/components/code-panel'
import { Hero } from '@/components/hero'
import { IdeaForm } from '@/components/idea-form'
import { PaymentStatus, type Notice } from '@/components/payment-status'
import { PreviewPanel } from '@/components/preview-panel'
import { MAX_GENERATIONS, MIN_DESCRIPTION_LENGTH, PRICE_LABEL } from '@/lib/utils'
import type { CurrentProjectResponse, GenerateResponse } from '@/types/project'

const DRAFT_KEY = 'waitlist:idea'
const PAYMENT_POLL_MS = 2500
const PAYMENT_POLL_MAX_ATTEMPTS = 24 // about 60 seconds
const GENERATION_POLL_MS = 3000

/* ---------- draft persistence (survives the Google sign-in and checkout redirects) ---------- */

function readDraft(): string {
  try {
    return window.localStorage.getItem(DRAFT_KEY) ?? ''
  } catch {
    return ''
  }
}

function writeDraft(value: string) {
  try {
    window.localStorage.setItem(DRAFT_KEY, value)
  } catch {
    /* storage can be unavailable (private mode); the server also keeps a copy at checkout */
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* ignore */
  }
}

/** Only ever navigate to an https URL returned by our own checkout API. */
function toHttpsUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

interface ApiError {
  error?: string
  code?: string
}

export default function Page() {
  const { isLoaded, isSignedIn } = useAuth()
  const { isLoaded: signInLoaded, signIn } = useSignIn()

  const [description, setDescription] = useState('')
  const [server, setServer] = useState<CurrentProjectResponse | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  const [isRedirecting, setIsRedirecting] = useState(false) // going to Google sign-in or Dodo checkout
  const [isPollingPayment, setIsPollingPayment] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const resultRef = useRef<HTMLDivElement>(null)
  const paymentReturnRef = useRef<string | null>(null)

  /* ---------- derived state ---------- */

  const hasPaid = server?.user.hasPaid ?? false
  const project = server?.project ?? null
  const generatedHtml = hasPaid ? project?.generatedHtml : undefined
  const generating = isGenerating || (server?.generation.inProgress ?? false)
  const generationsLeft = server?.usage.remaining ?? MAX_GENERATIONS
  // Buy (again) when never paid, or when every generation of the last payment is used.
  const needsPayment = !hasPaid || (generationsLeft <= 0 && !generating)

  let ctaLabel = 'Generate'
  let ctaLoading = false
  let ctaDisabled = false

  if (!isLoaded) {
    ctaDisabled = true
  } else if (!isSignedIn) {
    ctaLoading = isRedirecting
    ctaDisabled = isRedirecting || !signInLoaded || !description.trim()
  } else if (!server) {
    ctaLabel = 'Loading…'
    ctaLoading = true
    ctaDisabled = true
  } else if (needsPayment) {
    // Not paid yet, or all generations of the last payment are used: same $0.99 button.
    if (isRedirecting || isPollingPayment) {
      ctaLabel = 'Processing payment…'
      ctaLoading = true
      ctaDisabled = true
    } else {
      ctaLabel = `Unlock for ${PRICE_LABEL}`
      ctaDisabled = !description.trim()
    }
  } else if (generating) {
    ctaLabel = 'Waitlist is creating your page…'
    ctaLoading = true
    ctaDisabled = true
  } else if (generatedHtml) {
    ctaLabel = 'View your waitlist page'
  } else {
    ctaLabel = 'Generate waitlist page'
    ctaDisabled = !description.trim()
  }

  const activeNotice: Notice | null = isPollingPayment
    ? {
        kind: 'loading',
        title: 'Processing payment…',
        message: 'Waiting for confirmation from the payment provider. This usually takes a few seconds.',
      }
    : notice

  /* ---------- server state ---------- */

  const loadState = useCallback(async (): Promise<CurrentProjectResponse | null> => {
    try {
      const response = await fetch('/api/projects/current', { cache: 'no-store' })
      if (!response.ok) return null
      const data = (await response.json()) as CurrentProjectResponse
      setServer(data)
      return data
    } catch {
      return null
    }
  }, [])

  // Restore the idea saved before sign-in / checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') === 'return') {
      paymentReturnRef.current = params.get('status') ?? 'unknown'
      window.history.replaceState(null, '', window.location.pathname)
    }
    const draft = readDraft()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (draft) setDescription(draft)
  }, [])

  // Reset transient flags when the browser restores the page from its back/forward cache.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setIsRedirecting(false)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  // Load account state once Clerk knows who the visitor is.
  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setServer(null)
      return
    }

    let cancelled = false
    ;(async () => {
      const data = await loadState()
      if (cancelled) return

      if (!data) {
        setNotice({
          kind: 'error',
          title: 'Could not load your account',
          message: 'We could not reach the server. Check your connection and refresh the page.',
        })
        return
      }

      setDescription((current) => {
        if (data.user.hasPaid && data.project) return data.project.businessDescription
        if (current.trim()) return current
        return data.project?.businessDescription ?? current
      })

      const returned = paymentReturnRef.current
      paymentReturnRef.current = null
      if (!returned) return

      if (returned === 'cancelled' || returned === 'canceled') {
        setNotice({
          kind: 'error',
          title: 'Payment cancelled',
          message: 'You were not charged. Your idea is saved, so you can unlock whenever you are ready.',
        })
      } else if (returned === 'failed') {
        setNotice({
          kind: 'error',
          title: 'Payment failed',
          message: 'Your payment did not go through and you were not charged. Please try again.',
        })
      } else if (!data.user.hasPaid || data.usage.remaining <= 0) {
        // Never trust the redirect alone: wait for the signed webhook to confirm the payment
        // (first payment: hasPaid flips; buying again: the generation count starts over).
        setIsPollingPayment(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, loadState])

  // Poll until the webhook has confirmed the payment.
  useEffect(() => {
    if (!isPollingPayment) return

    let attempts = 0
    const timer = window.setInterval(async () => {
      attempts += 1
      const data = await loadState()

      if (data?.user.hasPaid && data.usage.remaining > 0) {
        setIsPollingPayment(false)
        setNotice({
          kind: 'success',
          title: 'Payment confirmed',
          message: data.project?.generatedHtml
            ? `You have ${data.usage.remaining} new generations. Use "Regenerate design" to try a new look.`
            : 'You are all set. Click "Generate waitlist page" to build your site.',
        })
        return
      }
      if (data?.payment?.status === 'failed') {
        setIsPollingPayment(false)
        setNotice({
          kind: 'error',
          title: 'Payment failed',
          message: 'Your payment did not go through and you were not charged. Please try again.',
        })
        return
      }
      if (attempts >= PAYMENT_POLL_MAX_ATTEMPTS) {
        setIsPollingPayment(false)
        setNotice({
          kind: 'info',
          title: 'Still waiting for confirmation',
          message:
            'If you completed the payment, confirmation can take a minute. Your page will unlock automatically once it arrives.',
          actionLabel: 'Check again',
          onAction: () => {
            setNotice(null)
            setIsPollingPayment(true)
          },
        })
      }
    }, PAYMENT_POLL_MS)

    return () => window.clearInterval(timer)
  }, [isPollingPayment, loadState])

  // If a generation is running (for example after a reload), keep checking until it ends.
  const serverGenerating = server?.generation.inProgress ?? false
  useEffect(() => {
    if (!serverGenerating || isGenerating) return
    const timer = window.setInterval(() => {
      void loadState()
    }, GENERATION_POLL_MS)
    return () => window.clearInterval(timer)
  }, [serverGenerating, isGenerating, loadState])

  /* ---------- actions ---------- */

  function scrollToResult() {
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function validDescription(): string | null {
    const text = description.trim()
    if (text.length < MIN_DESCRIPTION_LENGTH) {
      setNotice({
        kind: 'error',
        title: 'Tell us a bit more',
        message: `Please describe your idea in at least ${MIN_DESCRIPTION_LENGTH} characters.`,
      })
      return null
    }
    return text
  }

  async function startSignIn() {
    const text = validDescription()
    if (!text) return
    if (!signInLoaded || !signIn) return

    writeDraft(text)
    setIsRedirecting(true)
    try {
      // Go straight to Google (no Clerk sign-in screen). Google sends the visitor to
      // /sso-callback, which finishes the session and then lands on `/`.
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      })
    } catch {
      setIsRedirecting(false)
      setNotice({
        kind: 'error',
        title: 'Sign-in failed',
        message: 'We could not start Google sign-in. Your idea is saved. Please try again.',
      })
    }
  }

  async function startCheckout() {
    const text = validDescription()
    if (!text) return

    writeDraft(text)
    setIsRedirecting(true)
    try {
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: text }),
      })
      const data = (await response.json().catch(() => ({}))) as ApiError & { checkoutUrl?: string }

      const checkoutUrl = response.ok ? toHttpsUrl(data.checkoutUrl) : null

      if (!checkoutUrl) {
        setIsRedirecting(false)
        if (data.code === 'already_paid') {
          await loadState()
          setNotice({ kind: 'info', message: data.error ?? 'You still have generations left.' })
        } else if (response.status === 401) {
          setNotice({ kind: 'error', title: 'Please sign in again', message: data.error ?? 'Your session has expired.' })
        } else {
          setNotice({
            kind: 'error',
            title: 'Could not start checkout',
            message: data.error ?? 'Something went wrong. Please try again.',
          })
        }
        return
      }

      window.location.assign(checkoutUrl)
    } catch {
      setIsRedirecting(false)
      setNotice({
        kind: 'error',
        title: 'Could not start checkout',
        message: 'We could not reach the server. Check your connection and try again.',
      })
    }
  }

  async function generate(regenerate: boolean) {
    const text = regenerate ? null : validDescription()
    if (!regenerate && !text) return

    setNotice(null)
    setIsGenerating(true)
    setIsRegenerating(regenerate)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regenerate ? { regenerate: true } : { description: text }),
      })
      const data = (await response.json().catch(() => ({}))) as Partial<GenerateResponse> & ApiError

      if (!response.ok || !data.project) {
        let title = 'Page generation failed'
        if (response.status === 401) title = 'Please sign in again'
        else if (response.status === 402) title = 'Payment not confirmed yet'
        else if (data.code === 'generation_limit_reached') title = 'No generations left'
        else if (response.status === 429) title = 'Slow down a little'
        else if (data.code === 'invalid_ai_output') title = 'The AI returned an invalid page'
        else if (data.code?.startsWith('ai_')) title = 'The AI service had a problem'

        setNotice({
          kind: 'error',
          title,
          message: data.error ?? 'Something went wrong. Please try again. You will not be charged again.',
        })
        void loadState()
        return
      }

      const project = data.project
      const usage = data.usage
      setServer((previous) =>
        previous
          ? { ...previous, project, generation: { inProgress: false }, usage: usage ?? previous.usage }
          : previous,
      )
      clearDraft()
      setNotice({
        kind: 'success',
        title: regenerate ? 'New design ready' : 'Your waitlist page is ready',
        message:
          (data.usage?.remaining ?? 0) > 0
            ? `Preview it, copy the code, or download the single HTML file. You have ${data.usage?.remaining} of ${MAX_GENERATIONS} generations left.`
            : `Copy or download your page now. You have used all ${MAX_GENERATIONS} generations. Unlock for ${PRICE_LABEL} to get ${MAX_GENERATIONS} more.`,
      })
      window.setTimeout(scrollToResult, 50)
    } catch {
      setNotice({
        kind: 'error',
        title: 'Connection lost',
        message: 'We lost connection while generating. If your page finishes in the background it will appear here.',
      })
      void loadState()
    } finally {
      setIsGenerating(false)
      setIsRegenerating(false)
    }
  }

  async function handleCta() {
    setNotice(null)
    if (!isLoaded) return
    if (!isSignedIn) return startSignIn()
    if (!server) return
    if (!hasPaid) return startCheckout()
    if (generating) return
    if (generationsLeft <= 0) return startCheckout()
    if (generatedHtml) return scrollToResult()
    return generate(false)
  }

  /* ---------- render ---------- */

  return (
    <main className="min-h-dvh bg-white text-black lg:h-dvh lg:overflow-hidden">
      <section className="flex min-h-dvh flex-col bg-white lg:h-full lg:min-h-0">
        <Hero>
          <span className="text-[10px] font-semibold whitespace-nowrap text-neutral-500">
            {hasPaid ? (
              <>
                <span className="sm:hidden">
                  {generationsLeft}/{MAX_GENERATIONS} LEFT
                </span>
                <span className="hidden sm:inline">
                  {generationsLeft} OF {MAX_GENERATIONS} GENERATIONS LEFT
                </span>
              </>
            ) : (
              <>
                <span className="sm:hidden">{PRICE_LABEL}</span>
                <span className="hidden sm:inline">
                  ONE-TIME {PRICE_LABEL} · {MAX_GENERATIONS} GENERATIONS
                </span>
              </>
            )}
          </span>
          {isSignedIn ? <UserButton /> : null}
        </Hero>

        <IdeaForm
          value={description}
          onChange={setDescription}
          onSubmit={handleCta}
          ctaLabel={ctaLabel}
          ctaDisabled={ctaDisabled}
          ctaLoading={ctaLoading}
          readOnly={Boolean(generatedHtml) || generating}
        />

        <PaymentStatus notice={activeNotice} onDismiss={() => setNotice(null)} />

        <div ref={resultRef} className="grid min-h-0 flex-1 lg:grid-cols-2 lg:overflow-hidden">
          <PreviewPanel
            html={generatedHtml}
            generating={generating}
            regenerating={isRegenerating}
          />
          <CodePanel
            html={generatedHtml}
            productName={project?.generatedName}
            canRegenerate={hasPaid && Boolean(generatedHtml)}
            regenerationsLeft={generationsLeft}
            regenerating={isRegenerating}
            disabled={generating}
            onRegenerate={() => generate(true)}
            onError={(message) => setNotice({ kind: 'error', message })}
          />
        </div>
      </section>
    </main>
  )
}
