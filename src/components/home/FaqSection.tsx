import type { ReactNode } from 'react'
import { XLogoIcon } from '@/components/home/BrandIcons'
import { Button } from '@/components/ui/button'
import { ETHERFI_EXPORT_GUIDE_URL, GOODMORNING_X_URL, REPO_URL } from '@/lib/links'

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
 * The questions people ask first, with every answer on show: four short
 * cards in a grid (one column on phones), nothing to open or close, and a
 * way to ask something else underneath.
 */
function FaqSection() {
  return (
    <section aria-labelledby="faq" className="flex flex-col items-center gap-8">
      <div className="flex max-w-2xl flex-col items-center gap-2 text-center">
        <span className="text-xs font-semibold tracking-wide text-text-dim uppercase">FAQ</span>
        <h2 id="faq" className="font-heading text-2xl font-semibold sm:text-3xl">
          Questions, <span className="text-primary">answered</span>.
        </h2>
        <p className="text-base text-text-dim">The short answers to what people ask first.</p>
      </div>

      <dl className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        {QUESTIONS.map(({ question, answer }, index) => (
          <div
            key={question}
            className="flex flex-col gap-3 rounded-2xl border border-[#161a24] bg-[#0d1016] p-6 transition-colors hover:border-accent-2/30"
          >
            <dt className="flex flex-col gap-2">
              <span className="font-heading text-sm font-semibold text-accent-2">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="font-heading text-lg font-semibold">{question}</span>
            </dt>
            <dd className="text-sm leading-relaxed text-text-dim">{answer}</dd>
          </div>
        ))}
      </dl>

      <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-text-dim">
        Still have a question?
        <Button asChild size="sm" variant="secondary">
          <a href={GOODMORNING_X_URL} target="_blank" rel="noreferrer">
            <XLogoIcon className="size-3.5" />
            Ask us on X
          </a>
        </Button>
      </p>
    </section>
  )
}

export default FaqSection
