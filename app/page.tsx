'use client'

import { useMemo, useState } from 'react'
import { Code2, Download, Eye, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const starter = {
  title: 'Turn interest into momentum.',
  subtitle: 'Join the early access list for a calmer, smarter way to get work done.',
  button: 'Join the waitlist',
  note: 'No spam. Just a note when we are ready.',
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]!)
}

function buildHtml(copy: typeof starter) {
  const title = escapeHtml(copy.title)
  const subtitle = escapeHtml(copy.subtitle)
  const button = escapeHtml(copy.button)
  const note = escapeHtml(copy.note)

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | Early access</title>
  <style>
    * { box-sizing: border-box; }
    html { scrollbar-width: none; }
    html::-webkit-scrollbar { display: none; }
    body { margin: 0; background: #fff; color: #111; font-family: Arial, Helvetica, sans-serif; }
    .hero { position: relative; min-height: 430px; height: min(67vh, 620px); display: flex; align-items: flex-end; overflow: hidden; background: #111; color: #fff; }
    .hero-image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 52%; filter: grayscale(1) brightness(.46); }
    .hero-copy { position: relative; z-index: 1; width: min(100%, 1040px); padding: 52px 6% 42px; }
    .eyebrow { margin: 0 0 19px; font-size: 10px; font-weight: 700; }
    h1 { max-width: 900px; margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 70px; font-weight: 400; line-height: .98; }
    .subtitle { max-width: 540px; margin: 18px 0 24px; color: #e4e4e4; font-size: 15px; line-height: 1.55; }
    .signup { display: flex; width: min(100%, 480px); gap: 0; }
    .signup input { min-width: 0; flex: 1; height: 52px; padding: 0 15px; border: 1px solid #fff; border-right: 0; border-radius: 0; background: transparent; color: #fff; font: inherit; }
    .signup input::placeholder { color: #d4d4d4; }
    .signup button { min-height: 52px; padding: 0 19px; border: 1px solid #fff; border-radius: 0; background: #fff; color: #111; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
    .note { margin: 12px 0 0; color: #d4d4d4; font-size: 11px; }
    .hero-index { position: absolute; right: 6%; bottom: 46px; z-index: 1; font-size: 10px; }
    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; padding: 42px 6% 30px; }
    .details .eyebrow { color: #626262; }
    h2 { max-width: 480px; margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 38px; font-weight: 400; line-height: 1.05; }
    .details-copy { max-width: 420px; margin: 26px 0 0; color: #525252; font-size: 14px; line-height: 1.7; }
    .details-bottom { grid-column: 1 / -1; display: flex; justify-content: space-between; gap: 16px; padding-top: 16px; border-top: 1px solid #dedede; color: #626262; font-size: 9px; font-weight: 700; }
    footer { display: flex; justify-content: space-between; gap: 16px; padding: 16px 6%; border-top: 1px solid #dedede; color: #626262; font-size: 10px; }
    .success { width: 100%; margin: 0; padding: 17px; border: 1px solid #fff; color: #fff; font-size: 14px; }
    @media (max-width: 700px) {
      .hero { min-height: 570px; height: auto; }
      .hero-copy { padding: 40px 6% 34px; }
      h1 { font-size: 45px; }
      .subtitle { font-size: 14px; }
      .signup { flex-direction: column; gap: 8px; }
      .signup input { border-right: 1px solid #fff; }
      .hero-index { right: 6%; bottom: 12px; }
      .details { grid-template-columns: 1fr; gap: 10px; padding-top: 32px; }
      h2 { font-size: 32px; }
      .details-copy { margin-top: 8px; }
      .details-bottom { grid-column: auto; margin-top: 22px; }
    }
  </style>
</head>
<body>
  <main>
    <section class="hero" aria-labelledby="waitlist-title">
      <img class="hero-image" src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=2200&q=85" alt="A bright, thoughtfully designed collaborative studio" />
      <div class="hero-copy">
        <p class="eyebrow">NOW OPEN / EARLY ACCESS</p>
        <h1 id="waitlist-title">${title}</h1>
        <p class="subtitle">${subtitle}</p>
        <form class="signup">
          <label hidden for="email">Email address</label>
          <input id="email" type="email" placeholder="Your email address" autocomplete="email" required />
          <button type="submit">${button}</button>
        </form>
        <p class="note">${note}</p>
      </div>
      <div class="hero-index">01 / A NEW WAY FORWARD</div>
    </section>
    <section class="details">
      <div><p class="eyebrow">A GOOD PLACE TO BEGIN</p><h2>Be there from the beginning.</h2></div>
      <p class="details-copy">Get a first look, thoughtful updates, and an invitation when we open the doors. No noise. Just the things worth knowing.</p>
      <div class="details-bottom"><span>EARLY ACCESS, NOT NOISE</span><span>MADE FOR WHAT COMES NEXT</span></div>
    </section>
  </main>
  <footer><span>WAITLIST / 2026</span><span>See you soon.</span></footer>
  <script>
    document.querySelector('.signup').addEventListener('submit', (event) => {
      event.preventDefault();
      event.currentTarget.innerHTML = '<p class="success" role="status">You are on the list. We will be in touch.</p>';
    });
  </script>
</body>
</html>`
}

export default function Page() {
  const [description, setDescription] = useState('A thoughtful productivity app that helps small teams focus on the work that matters.')
  const [copy, setCopy] = useState(starter)
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview')
  const [isGenerating, setIsGenerating] = useState(false)
  const html = useMemo(() => buildHtml(copy), [copy])

  async function generate() {
    if (!description.trim()) return
    setIsGenerating(true)
    try {
      const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description }) })
      const data = await response.json()
      if (response.ok && data.copy) setCopy({ ...starter, ...data.copy })
    } finally { setIsGenerating(false) }
  }

  function exportHtml() {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'waitlist.html'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen bg-white text-black md:h-dvh md:overflow-hidden">
      <section className="flex min-h-screen flex-col bg-white md:h-full md:min-h-0">
        <div className="flex items-center justify-between border-b border-neutral-300 px-5 py-3 text-[11px]">
          <div className="flex items-center gap-3">Waitlist</div>
        </div>
        <div className="border-b border-neutral-300 p-4 sm:p-6">
          <div className="mx-auto max-w-4xl">
            <label htmlFor="product-description" className="mb-2 block text-[10px] font-semibold text-neutral-600">YOUR IDEA</label>
            <div className="flex items-center gap-3 border border-neutral-400 bg-white p-2 transition-colors hover:border-black focus-within:border-black focus-within:ring-2 focus-within:ring-black/10">
              <input id="product-description" value={description} onChange={(event) => setDescription(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); generate() } }} aria-label="Describe your SaaS or business" aria-busy={isGenerating} className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-500" placeholder="Describe your SaaS or business..." />
              <Button onClick={generate} disabled={isGenerating || !description.trim()} size="sm" className="h-11 rounded-none bg-black px-4 text-sm text-white hover:bg-neutral-800">
                {isGenerating ? <>Generating <LoaderCircle data-icon="inline-end" className="animate-spin" /></> : <>Generate</>}
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-b border-neutral-300 px-5 py-2.5"><div className="flex items-center gap-1 text-[11px]"><button onClick={() => setActiveTab('preview')} className={`flex items-center gap-1.5 px-2.5 py-1.5 ${activeTab === 'preview' ? 'bg-black text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}><Eye className="size-3.5" /> Preview</button><button onClick={() => setActiveTab('code')} className={`flex items-center gap-1.5 px-2.5 py-1.5 ${activeTab === 'code' ? 'bg-black text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}><Code2 className="size-3.5" /> Code</button></div><Button onClick={exportHtml} variant="outline" size="sm" className="h-7 rounded-none border-black bg-white px-2.5 text-[11px] text-black hover:bg-black hover:text-white"><Download data-icon="inline-start" /> Export</Button></div>
        <div className="grid min-h-0 flex-1 md:grid-cols-2 md:overflow-hidden">
          <div className="min-h-[380px] border-b border-neutral-300 bg-white p-5 md:flex md:min-h-0 md:flex-col md:overflow-hidden md:border-b-0 md:border-r md:p-7"><div className="mb-4 flex shrink-0 items-center gap-2 text-[11px] font-medium text-neutral-700"><Code2 className="size-3.5" /> {activeTab === 'code' ? 'HTML + CSS + JS' : 'Code'}</div><pre className="overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-5 text-neutral-700 md:min-h-0 md:flex-1 scrollbar-hidden">{html}</pre></div>
          <div className="min-h-[380px] overflow-y-auto bg-neutral-100 p-5 md:min-h-0 md:p-7 scrollbar-hidden"><div className="mb-4 flex items-center gap-2 text-[11px] font-medium text-black"><Eye className="size-3.5" /> Preview</div><iframe title="Waitlist landing page preview" srcDoc={html} sandbox="allow-forms allow-scripts" className="h-[620px] w-full border border-neutral-400 bg-white md:h-full md:min-h-[520px]" /></div>
        </div>
      </section>
    </main>
  )
}
