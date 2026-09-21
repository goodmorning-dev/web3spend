import heroCardImage from '@/assets/hero-card.webp'

/**
 * The hero's card artwork. The image itself already bakes in the ambient
 * glow, the floating callouts (spending insights, recorded cashback, etc.),
 * and the handwritten tagline, so this component is just a responsive
 * `<img>`; nothing else needs to know it isn't built from CSS.
 */
function HeroCard() {
  return (
    <div className="relative mx-auto flex w-full min-w-0 items-center justify-center">
      <div
        aria-hidden="true"
        className="absolute size-3/4 rounded-full bg-primary/40 blur-3xl"
      />
      <img
        src={heroCardImage}
        alt="A Web3Spend card, surrounded by callouts for spending insights, recorded cashback, on-device privacy, and support for all currencies"
        className="relative z-10 w-full max-w-full"
      />
    </div>
  )
}

export default HeroCard
