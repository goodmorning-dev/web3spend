import { ChartPie, FileDown, Handshake, Plus, ShieldCheck } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { XLogoIcon } from '@/components/home/BrandIcons'
import { Button } from '@/components/ui/button'
import { ETHERFI_EXPORT_GUIDE_URL, GOODMORNING_X_URL, REPO_URL } from '@/lib/links'

const LINK_CLASS = 'font-medium text-accent-2 hover:underline'

const QUESTIONS: {
  icon: ComponentType<{ className?: string }>
  question: string
  answer: ReactNode
}[] = [
  {
    icon: ShieldCheck,
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
    icon: FileDown,
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
    icon: Handshake,
    question: 'Is this affiliated with ether.fi?',
    answer:
      "No. Web3Spend is an independent, open source tool made by goodmorning.dev. It isn't affiliated with or endorsed by ether.fi; it reads the export ether.fi already gives you.",
  },
  {
    icon: ChartPie,
    question: 'What does it show me?',
    answer:
      'Where your card money goes: spending by category and by month, the cashback you earned and your effective cashback rate, the subscriptions it spots, day-by-day activity, and whether each purchase was paid directly or in Borrow Mode. You can narrow it all down by card, currency and month.',
  },
]

/**
 * The questions people ask first, answered briefly: the heading and a way
 * to ask something else on the left, the questions on the right (stacked
 * on phones), laid out like the roadmap above. Native <details>, so each
 * one opens with a click or the keyboard and needs no script; they open
 * and close smoothly where the browser supports it (index.css).
 */
function FaqSection() {
  return (
    <section
      aria-labelledby="faq"
      className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[360px_1fr] lg:gap-12"
    >
      <div className="flex flex-col items-start gap-2 lg:sticky lg:top-8">
        <span className="text-xs font-semibold tracking-wide text-text-dim uppercase">FAQ</span>
        <h2 id="faq" className="font-heading text-2xl font-semibold sm:text-3xl">
          Questions, <span className="text-primary">answered</span>.
        </h2>
        <p className="max-w-sm text-base text-text-dim">
          The short answers to what people ask first.
        </p>
        <div className="mt-4 hidden w-full max-w-sm flex-col items-start gap-3 rounded-2xl border border-[#161a24] bg-[#0d1016] p-5 lg:flex">
          <span className="font-heading text-base font-semibold">Still have a question?</span>
          <span className="text-sm text-text-dim">Ask us on X and we&apos;ll get back to you.</span>
          <AskOnXButton />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-3xl border border-[#161a24] bg-[#0d1016] divide-y divide-white/5">
          {QUESTIONS.map(({ icon: Icon, question, answer }) => (
            <details
              key={question}
              className="group faq-details transition-colors open:bg-accent-2/[0.04]"
            >
              <summary className="flex cursor-pointer list-none items-center gap-4 p-5 transition-colors hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-2/10 text-accent-2">
                  <Icon className="size-5" />
                </span>
                <span className="flex-1 font-heading text-base font-semibold">{question}</span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-accent-2 transition-colors group-open:border-accent-2/40 group-open:bg-accent-2/15">
                  <Plus className="size-4 transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" />
                </span>
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-text-dim sm:pl-[4.75rem]">
                {answer}
              </p>
            </details>
          ))}
        </div>

        {/* The same question on phones, where the left column's card is
            hidden to keep the section short. */}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-text-dim lg:hidden">
          Still have a question?
          <AskOnXButton />
        </p>
      </div>
    </section>
  )
}

function AskOnXButton() {
  return (
    <Button asChild size="sm" variant="secondary">
      <a href={GOODMORNING_X_URL} target="_blank" rel="noreferrer">
        <XLogoIcon className="size-3.5" />
        Ask us on X
      </a>
    </Button>
  )
}

export default FaqSection
