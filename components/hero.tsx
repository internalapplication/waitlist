export function Hero({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-neutral-300 px-4 py-3 text-[11px] sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex items-center gap-2 font-medium tracking-tight">Waitlist</span>
        <span className="hidden truncate text-neutral-500 sm:inline">/ Turn your idea into a waitlist page.</span>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">{children}</div>
    </header>
  )
}
