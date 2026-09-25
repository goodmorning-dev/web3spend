import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { REPO_URL } from '@/lib/links'

const LINK_CLASS = 'font-medium text-accent-2 hover:underline'
const LIST_CLASS = 'flex flex-col gap-2 pl-5 marker:text-accent-2'
const LEAD_CLASS = 'font-semibold text-foreground'

// The pages ether.fi's own guide sends people to for the export.
const ETHERFI_CASH_URL = 'https://www.ether.fi/app/cash'
const ETHERFI_SIGN_IN_URL = 'https://www.ether.fi/app/cash/sign-in'
const ETHERFI_TRANSACTION_HISTORY_URL = 'https://www.ether.fi/app/cash/transaction-history'

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={LINK_CLASS}>
      {children}
    </a>
  )
}

const QUESTIONS: { question: string; answer: ReactNode }[] = [
  {
    question: "How do I know my data isn't sent anywhere?",
    answer: (
      <>
        <p>
          You don&apos;t have to take our word for it. Web3Spend reads and processes your file
          entirely in your browser, and there&apos;s no server that receives your transactions.
          There are three ways to check:
        </p>
        <ol className={`list-decimal ${LIST_CLASS}`}>
          <li>
            <span className={LEAD_CLASS}>Read the code.</span> Web3Spend is open source, so anyone
            can see exactly what it does with your file.{' '}
            <ExternalLink href={REPO_URL}>See it on GitHub</ExternalLink>.
          </li>
          <li>
            <span className={LEAD_CLASS}>Watch the network.</span> Open your browser&apos;s
            developer tools (F12, or Cmd+Option+I on a Mac), go to the Network tab, and import your
            file. You&apos;ll see that none of the requests contain your transaction data.
          </li>
          <li>
            <span className={LEAD_CLASS}>Go offline.</span> Install Web3Spend from your browser,
            turn off your internet connection, and import your file. Everything still works, because
            nothing needs to leave your device.
          </li>
        </ol>
      </>
    ),
  },
  {
    question: 'Where do I get my export?',
    answer: (
      <>
        <p>
          If you use the ether.fi Cash card and need a statement of your fiat and crypto spending:
        </p>
        <ol className={`list-decimal ${LIST_CLASS}`}>
          <li>
            Go to the <ExternalLink href={ETHERFI_CASH_URL}>ether.fi Cash dashboard</ExternalLink>.
          </li>
          <li>
            If prompted, sign in to your account on the{' '}
            <ExternalLink href={ETHERFI_SIGN_IN_URL}>sign-in page</ExternalLink>.
          </li>
          <li>
            Go to your{' '}
            <ExternalLink href={ETHERFI_TRANSACTION_HISTORY_URL}>
              Transaction History page
            </ExternalLink>
            .
          </li>
          <li>Click the date selector to choose the tax year or time period you want to export.</li>
          <li>Click the Download button to save the statement.</li>
        </ol>
        <p>You can follow the same steps in the ether.fi mobile app, under Transaction History.</p>
      </>
    ),
  },
  {
    question: 'Is this affiliated with ether.fi?',
    answer: (
      <p>
        No. Web3Spend is an independent project, built by developers who use ether.fi cards
        themselves and wanted a clearer picture of their own spending. We built it for ourselves and
        decided to share it with the community. It isn&apos;t endorsed by or connected to ether.fi.
      </p>
    ),
  },
  {
    question: 'What does it show me?',
    answer: (
      <>
        <p>Once you import your export, you get:</p>
        <ul className={`list-disc ${LIST_CLASS}`}>
          <li>
            <span className={LEAD_CLASS}>The totals:</span> how much you&apos;ve spent, how much
            cashback you&apos;ve earned, and your effective cashback rate.
          </li>
          <li>
            <span className={LEAD_CLASS}>Monthly trends:</span> your spending this month compared
            with last month and with your monthly average.
          </li>
          <li>
            <span className={LEAD_CLASS}>Categories:</span> where your money goes, broken down by
            merchant category.
          </li>
          <li>
            <span className={LEAD_CLASS}>Activity patterns:</span> a year-long spending heatmap,
            plus your active days, longest spending streak, biggest day, and top weekday.
          </li>
          <li>
            <span className={LEAD_CLASS}>Transactions:</span> every purchase with its card, mode
            (Direct or Borrow), amount, cashback, and status.
          </li>
          <li>
            <span className={LEAD_CLASS}>Subscriptions:</span> recurring payments detected from your
            history.
          </li>
        </ul>
        <p>You can filter everything by card, currency, and month.</p>
      </>
    ),
  },
]

/**
 * The questions people ask first, as a plain list: large questions split
 * by thin lines, each opening its answer below it. Native <details>, so
 * each one opens with a click or the keyboard and needs no script; they
 * open and close smoothly where the browser supports it (index.css).
 */
function FaqSection() {
  return (
    <section aria-labelledby="faq" className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <h2 id="faq" className="text-center font-heading text-2xl font-semibold sm:text-3xl">
        Frequently asked questions
      </h2>

      <div className="border-t border-white/10">
        {QUESTIONS.map(({ question, answer }) => (
          <details key={question} className="group faq-details border-b border-white/10">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 font-heading text-lg font-semibold transition-colors hover:text-accent-2 sm:text-xl [&::-webkit-details-marker]:hidden">
              {question}
              <Plus className="size-5 shrink-0 text-accent-2 transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" />
            </summary>
            <div className="flex max-w-2xl flex-col gap-3 pb-6 text-base leading-relaxed text-text-dim">
              {answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}

export default FaqSection
