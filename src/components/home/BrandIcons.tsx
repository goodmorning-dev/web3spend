/** lucide-react intentionally ships no brand/logo icons, so the X and
 * GitHub marks used on the marketing page are small local SVGs instead. */

export function XLogoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.9 2.6h3.1l-6.8 7.7 8 10.5h-6.2l-4.9-6.4-5.6 6.4H3.4l7.2-8.3-7.6-9.9h6.4l4.4 5.9zm-1.1 16.3h1.7L7.3 4.4H5.5z" />
    </svg>
  )
}

export function GithubLogoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.5 0-.24-.01-1.05-.01-1.9-2.78.62-3.37-1.22-3.37-1.22-.45-1.18-1.11-1.49-1.11-1.49-.9-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.34-1.11.62-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 5.01 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.64 1.03 2.76 0 3.94-2.34 4.81-4.57 5.06.36.32.68.95.68 1.92 0 1.39-.01 2.5-.01 2.84 0 .28.18.6.69.5A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
    </svg>
  )
}
