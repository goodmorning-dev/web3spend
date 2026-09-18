const CHIPS = [
  { label: '−€3.40 Coffee', y: 82, delay: '0s' },
  { label: '+€0.62 Cashback', y: 120, delay: '1.7s' },
  { label: '−€41 Groceries', y: 158, delay: '3.4s' },
]

const TICKS = Array.from({ length: 8 }, (_, index) => index * 45)

/**
 * The home page's signature visual: transactions arrive on separate lanes
 * and seal behind a vault door that never opens outward, illustrating "your
 * data comes in, nothing goes back out" more viscerally than the privacy
 * copy alone.
 */
function VaultAnimation() {
  return (
    <div
      role="img"
      aria-label="Diagram showing transactions flowing in on separate lanes and sealing behind a vault door, never sent back out"
      className="mx-auto flex w-full max-w-[280px] flex-col items-center gap-2.5"
    >
      <svg viewBox="0 0 300 240" className="w-full overflow-visible">
        <defs>
          <radialGradient id="vaultGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle
          cx="232"
          cy="120"
          r="66"
          fill="url(#vaultGlow)"
          className="origin-[232px_120px] motion-safe:animate-vault-pulse"
        />

        {CHIPS.map((chip) => (
          <line
            key={chip.y}
            x1="16"
            y1={chip.y}
            x2="176"
            y2={chip.y}
            className="stroke-border"
            strokeWidth="2"
            strokeDasharray="1,7"
            strokeLinecap="round"
          />
        ))}

        {CHIPS.map((chip) => (
          <g
            key={chip.label}
            transform={`translate(0,${chip.y})`}
            className="motion-safe:animate-vault-chip"
            style={{ animationDelay: chip.delay }}
          >
            <rect
              x="0"
              y="-11"
              width="72"
              height="22"
              rx="6"
              className="fill-card stroke-border"
              strokeWidth="1.3"
            />
            <text
              x="36"
              y="3"
              textAnchor="middle"
              className="fill-text-dim text-[9px] font-medium tabular-nums"
            >
              {chip.label}
            </text>
          </g>
        ))}

        <g className="stroke-border" strokeWidth="2" strokeLinecap="round">
          {TICKS.map((angle) => {
            const outer = 52 + 9
            const inner = 52
            const radians = (angle * Math.PI) / 180
            const x1 = 232 + inner * Math.cos(radians)
            const y1 = 120 + inner * Math.sin(radians)
            const x2 = 232 + outer * Math.cos(radians)
            const y2 = 120 + outer * Math.sin(radians)
            return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} />
          })}
        </g>
        <circle cx="232" cy="120" r="52" fill="none" className="stroke-border" strokeWidth="2" />
        <circle
          cx="232"
          cy="120"
          r="40"
          className="fill-secondary stroke-primary"
          strokeWidth="2"
        />
        <g
          className="origin-[232px_120px] stroke-primary motion-safe:animate-vault-dial"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="232" y1="120" x2="232" y2="96" />
          <line x1="232" y1="120" x2="251" y2="132" />
          <line x1="232" y1="120" x2="213" y2="132" />
          <circle cx="232" cy="120" r="5.5" className="fill-primary" />
        </g>
      </svg>
      <span className="text-xs font-medium text-text-faint">In. Sealed. Never back out.</span>
    </div>
  )
}

export default VaultAnimation
