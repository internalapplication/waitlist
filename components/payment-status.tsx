'use client'

import { CircleAlert, CircleCheck, Info, LoaderCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type NoticeKind = 'error' | 'info' | 'success' | 'loading'

export interface Notice {
  kind: NoticeKind
  message: string
  title?: string
  actionLabel?: string
  onAction?: () => void
}

const styles: Record<NoticeKind, string> = {
  error: 'border-red-600 bg-red-50 text-red-800',
  info: 'border-neutral-400 bg-neutral-50 text-neutral-800',
  success: 'border-black bg-white text-black',
  loading: 'border-neutral-400 bg-neutral-50 text-neutral-800',
}

function NoticeIcon({ kind }: { kind: NoticeKind }) {
  if (kind === 'error') return <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
  if (kind === 'success') return <CircleCheck className="mt-0.5 size-3.5 shrink-0" />
  if (kind === 'loading') return <LoaderCircle className="mt-0.5 size-3.5 shrink-0 animate-spin" />
  return <Info className="mt-0.5 size-3.5 shrink-0" />
}

/** Banner for sign-in, payment and generation messages. */
export function PaymentStatus({ notice, onDismiss }: { notice: Notice | null; onDismiss: () => void }) {
  if (!notice) return null

  return (
    <div className="border-b border-neutral-300 px-3 py-3 sm:px-6">
      <div
        role={notice.kind === 'error' ? 'alert' : 'status'}
        className={cn('mx-auto flex max-w-4xl items-start gap-2.5 border px-3 py-2.5 text-[12px] leading-5', styles[notice.kind])}
      >
        <NoticeIcon kind={notice.kind} />
        <div className="min-w-0 flex-1">
          {notice.title ? <p className="font-semibold">{notice.title}</p> : null}
          <p>{notice.message}</p>
          {/* On phones the action sits under the message so the text keeps its full width. */}
          {notice.actionLabel && notice.onAction ? (
            <Button
              onClick={notice.onAction}
              variant="outline"
              size="sm"
              className="mt-2 h-9 rounded-none border-current bg-transparent px-3 text-[11px] hover:bg-black hover:text-white sm:hidden"
            >
              {notice.actionLabel}
            </Button>
          ) : null}
        </div>
        {notice.actionLabel && notice.onAction ? (
          <Button
            onClick={notice.onAction}
            variant="outline"
            size="sm"
            className="hidden h-7 shrink-0 rounded-none border-current bg-transparent px-2.5 text-[11px] hover:bg-black hover:text-white sm:inline-flex"
          >
            {notice.actionLabel}
          </Button>
        ) : null}
        {notice.kind !== 'loading' ? (
          <button type="button" onClick={onDismiss} aria-label="Dismiss message" className="-m-1 shrink-0 p-1.5 opacity-70 hover:opacity-100">
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
