import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CHART_COLORS, COLOR_GROUPS } from './brandData'

// Vitest runs from the repo root; import.meta.url isn't a file URL under jsdom.
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

/** The variables declared inside the `.dark { ... }` block of index.css. */
function darkTheme(): Map<string, string> {
  const start = css.indexOf('\n.dark {')
  const block = css.slice(start, css.indexOf('\n}', start))
  const variables = new Map<string, string>()
  for (const [, name, value] of block.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    variables.set(name, value.trim().toLowerCase())
  }
  return variables
}

describe('brand colors', () => {
  const theme = darkTheme()
  const everyColor = [...COLOR_GROUPS.flatMap((group) => group.colors), ...CHART_COLORS]

  it('reads the dark theme out of index.css', () => {
    expect(theme.get('--primary')).toBe('#f0b429')
  })

  it.each(everyColor.map((color) => [color.name, color]))(
    '%s matches the value in index.css',
    (_name, color) => {
      expect(theme.get(color.cssVar)).toBe(color.hex)
    },
  )

  it('lists the eight chart colors in order', () => {
    expect(CHART_COLORS.map((color) => color.cssVar)).toEqual(
      Array.from({ length: 8 }, (_, index) => `--chart-${index + 1}`),
    )
  })
})
