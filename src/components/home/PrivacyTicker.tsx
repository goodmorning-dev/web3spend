const FACTS = [
  'NO ACCOUNT',
  'NO WALLET CONNECTION',
  'NO SERVER UPLOAD',
  'PARSED IN YOUR BROWSER',
  'STORED IN YOUR BROWSER',
]

/**
 * A scrolling restatement of the privacy facts already in the hero copy;
 * purely decorative reinforcement, so it's hidden from assistive tech
 * rather than read out twice.
 */
function PrivacyTicker() {
  const items = [...FACTS, ...FACTS]

  return (
    <div aria-hidden="true" className="overflow-hidden border-y border-border py-3">
      <div className="flex w-max gap-3 whitespace-nowrap motion-safe:animate-marquee">
        {items.map((fact, index) => (
          <span
            key={`${fact}-${index}`}
            className={
              index % 2 === 0
                ? 'text-xs font-semibold tracking-wide text-primary'
                : 'text-xs font-semibold tracking-wide text-text-faint'
            }
          >
            {fact} <span className="text-text-faint">&middot;</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default PrivacyTicker
