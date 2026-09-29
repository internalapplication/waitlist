'use client'

import { Fragment, useMemo, useState } from 'react'
import { Check, Code2, Copy, Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, slugify } from '@/lib/utils'

/* ---------- lightweight, lossless HTML highlighter (renders text nodes only) ---------- */

type Token = { kind: 'text' | 'comment' | 'tag'; value: string }

const TOKEN_PATTERN = /(<!--[\s\S]*?-->)|(<\/?[a-zA-Z!][^>]*>)/g

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let last = 0
  for (const match of source.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0
    if (index > last) tokens.push({ kind: 'text', value: source.slice(last, index) })
    tokens.push({ kind: match[1] ? 'comment' : 'tag', value: match[0] })
    last = index + match[0].length
  }
  if (last < source.length) tokens.push({ kind: 'text', value: source.slice(last) })
  return tokens
}

function Tag({ value }: { value: string }) {
  // Split out quoted attribute values; everything else stays in the tag colour.
  const parts = value.split(/("[^"]*"|'[^']*')/g)
  return (
    <span className="font-medium text-black">
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className="font-normal text-neutral-500">
            {part}
          </span>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </span>
  )
}

function HighlightedHtml({ source }: { source: string }) {
  const tokens = useMemo(() => tokenize(source), [source])
  // React escapes every string it renders, so the source is displayed, never executed.
  return (
    <>
      {tokens.map((token, index) => {
        if (token.kind === 'comment') {
          return (
            <span key={index} className="italic text-neutral-400">
              {token.value}
            </span>
          )
        }
        if (token.kind === 'tag') return <Tag key={index} value={token.value} />
        return <Fragment key={index}>{token.value}</Fragment>
      })}
    </>
  )
}

/* ---------- panel ---------- */

interface CodePanelProps {
  html?: string
  productName?: string
  canRegenerate: boolean
  regenerationsLeft: number
  regenerating: boolean
  disabled: boolean
  onRegenerate: () => void
  onError: (message: string) => void
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(area)
  if (!ok) throw new Error('Copy failed')
}

export function CodePanel({ html, productName, canRegenerate, regenerationsLeft, regenerating, disabled, onRegenerate, onError }: CodePanelProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!html) return
    try {
      await copyText(html)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      onError('Could not copy to the clipboard. Select the code and copy it manually.')
    }
  }

  function handleDownload() {
    if (!html) return
    // Exactly one .html file, built in the browser.
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${slugify(productName || 'product')}-waitlist.html`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const actionClass =
    'h-10 rounded-none border-black bg-white px-2.5 text-[11px] text-black hover:bg-black hover:text-white sm:h-7'

  return (
    <div className="min-h-[320px] bg-white p-4 sm:p-5 lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden lg:p-7">
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-medium text-neutral-700">
          <Code2 className="size-3.5" /> HTML + CSS + JS
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <Button onClick={handleCopy} disabled={!html || disabled} variant="outline" size="sm" className={actionClass}>
            {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
            {copied ? 'Copied' : 'Copy HTML'}
          </Button>
          <Button onClick={handleDownload} disabled={!html || disabled} variant="outline" size="sm" className={actionClass}>
            <Download data-icon="inline-start" /> Download HTML
          </Button>
          {canRegenerate ? (
            <Button
              onClick={onRegenerate}
              disabled={disabled || regenerationsLeft <= 0}
              title={regenerationsLeft <= 0 ? 'You have used all your generations' : undefined}
              variant="outline"
              size="sm"
              className={cn(actionClass, 'col-span-2 sm:col-span-1')}
            >
              <RefreshCw data-icon="inline-start" className={regenerating ? 'animate-spin' : undefined} />
              {regenerationsLeft > 0 ? `Regenerate design (${regenerationsLeft} left)` : 'No generations left'}
            </Button>
          ) : null}
        </div>
      </div>
      {html ? (
        <pre
          tabIndex={0}
          aria-label="Generated HTML source code"
          className="max-h-[60dvh] overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-neutral-700 lg:max-h-none lg:min-h-0 lg:flex-1 lg:text-[10px] scrollbar-hidden"
        >
          <code>
            <HighlightedHtml source={html} />
          </code>
        </pre>
      ) : (
        <div className="flex min-h-[160px] items-center justify-center border border-dashed border-neutral-300 p-8 text-center text-[11px] text-neutral-500 lg:min-h-0 lg:flex-1">
          The generated code will appear here.
        </div>
      )}
    </div>
  )
}
