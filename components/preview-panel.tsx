'use client'

import { useMemo, useState } from 'react'
import { Eye, Monitor, RefreshCw, Smartphone } from 'lucide-react'
import { GenerationState } from '@/components/generation-state'
import { withPreviewCsp } from '@/lib/preview'
import { cn } from '@/lib/utils'

interface PreviewPanelProps {
  html?: string
  generating: boolean
  regenerating: boolean
}

export function PreviewPanel({ html, generating, regenerating }: PreviewPanelProps) {
  const [mode, setMode] = useState<'desktop' | 'mobile'>('desktop')
  const [refreshKey, setRefreshKey] = useState(0)
  const previewHtml = useMemo(() => (html ? withPreviewCsp(html) : ''), [html])

  const toggle = (active: boolean) =>
    cn('flex items-center gap-1.5 px-2 py-1 text-[11px]', active ? 'bg-black text-white' : 'text-neutral-600 hover:bg-neutral-200')

  return (
    <div className="min-h-[420px] overflow-y-auto border-b border-neutral-300 bg-neutral-100 p-4 sm:p-5 lg:flex lg:min-h-0 lg:flex-col lg:border-b-0 lg:border-r lg:p-7 scrollbar-hidden">
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-medium text-black">
          <Eye className="size-3.5" /> Preview
        </div>
        <div className="flex items-center gap-1">
          {/* The desktop/mobile switch is pointless on a phone, where the page is already narrow. */}
          <div className="hidden items-center gap-1 sm:flex">
            <button type="button" onClick={() => setMode('desktop')} aria-pressed={mode === 'desktop'} className={toggle(mode === 'desktop')}>
              <Monitor className="size-3.5" /> Desktop
            </button>
            <button type="button" onClick={() => setMode('mobile')} aria-pressed={mode === 'mobile'} className={toggle(mode === 'mobile')}>
              <Smartphone className="size-3.5" /> Mobile
            </button>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            aria-label="Reset preview"
            title="Reset preview"
            className="p-2 text-neutral-600 hover:bg-neutral-200 sm:p-1.5"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </div>

      {generating ? (
        <div className="lg:min-h-0 lg:flex-1">
          <GenerationState regenerating={regenerating} />
        </div>
      ) : html ? (
        <div className={cn('mx-auto w-full lg:min-h-0 lg:flex-1', mode === 'mobile' && 'max-w-[390px]')}>
          {/* AI-generated HTML is only ever rendered inside this sandboxed iframe.
              No allow-same-origin, popups, downloads or top-navigation. */}
          <iframe
            key={refreshKey}
            title="Generated Waitlist page preview"
            srcDoc={previewHtml}
            sandbox="allow-forms allow-scripts"
            referrerPolicy="no-referrer"
            className="h-[65dvh] min-h-[420px] w-full border border-neutral-400 bg-white lg:h-full lg:min-h-[520px]"
          />
        </div>
      ) : (
        <div className="flex min-h-[240px] items-center justify-center border border-dashed border-neutral-400 bg-white p-8 text-center text-[11px] text-neutral-500 lg:min-h-0 lg:flex-1">
          Your waitlist page preview will appear here.
        </div>
      )}
    </div>
  )
}
