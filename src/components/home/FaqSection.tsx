import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { ETHERFI_EXPORT_GUIDE_URL, REPO_URL } from '@/lib/links'

const LINK_CLASS = 'font-medium text-accent-2 hover:underline'

const QUESTIONS: { question: string; answer: ReactNode }[] = [
  {
    question: "How do I know my data isn't sent anywhere?",
    answer: (
      <>
        You don&apos;t have to take our word for it. Web3Spend is{' '}
        <a href={REPO_URL} target="_blank" rel="noreferrer" className={LINK_CLASS}>
          open source
        </a>
        , so anyone can read exactly what it does. It keeps working offline once it&apos;s loaded,
        so you can switch off your connection and import your export anyway. And you can watch it
        yourself: open your browser&apos;s developer tools, go to the Network tab, and import your
        file. Nothing leaves your device.
      </>
    ),
  },
  {
    question: 'Where do I get my export?',
    answer: (
      <>
        On ether.fi, open Transaction history, choose the dates you want, and click the download
        button. The mobile app works the same way. ether.fi&apos;s{' '}
        <a href={ETHERFI_EXPORT_GUIDE_URL} target="_blank" rel="noreferrer" className={LINK_CLASS}>
          guide
        </a>{' '}
        has the details.
      </>
    ),
  },
  {
    question: 'Is this affiliated with ether.fi?',
    answer:
      "No. Web3Spend is an independent, open source tool made by goodmorning.dev. It isn't affiliated with or endorsed by ether.fi; it reads the export ether.fi already gives you.",
  },
  {
    question: 'What does it show me?',
    answer:
      'Where your card money goes: spending by category and by month, the cashback you earned and your effective cashback rate, the subscriptions it spots, day-by-day activity, and whether each purchase was paid directly or in Borrow Mode. You can narrow it all down by card, currency and month.',
  },
]

/**
 * The questions people ask first, answered briefly. Native <details>, so
 * each one opens with a click or the keyboard and needs no script; they
 * open and close smoothly where the browser supports it (index.css).
 */
function FaqSection() {
  return (
    <section aria-labelledby="faq" className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-xs font-semibold tracking-wide text-text-dim uppercase">FAQ</span>
        <h2 id="faq" className="font-heading text-2xl font-semibold sm:text-3xl">
          Questions, <span className="text-primary">answered</span>.
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {QUESTIONS.map(({ question, answer }) => (
          <details
            key={question}
            className="group faq-details rounded-2xl border border-[#161a24] bg-[#0d1016] transition-colors open:border-accent-2/30"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-heading text-base font-semibold [&::-webkit-details-marker]:hidden">
              {question}
              <Plus className="size-4 shrink-0 text-accent-2 transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" />
            </summary>
            <p className="px-5 pb-5 text-sm text-text-dim">{answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export default FaqSection
