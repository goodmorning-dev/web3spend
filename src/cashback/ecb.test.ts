import { describe, expect, it } from 'vitest'
import { parseEcbEurUsd } from './ecb'

describe('parseEcbEurUsd', () => {
  it("reads the dollar rate and its date from the ECB's daily file", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope>
  <Cube>
    <Cube time='2026-10-09'>
      <Cube currency='USD' rate='1.1206'/>
      <Cube currency='JPY' rate='168.74'/>
    </Cube>
  </Cube>
</gesmes:Envelope>`

    expect(parseEcbEurUsd(xml)).toEqual({ rate: 1.1206, date: '2026-10-09' })
  })

  it("returns null when the file doesn't look as expected", () => {
    expect(parseEcbEurUsd('<html>Service unavailable</html>')).toBeNull()
    expect(parseEcbEurUsd("<Cube time='2026-10-09'><Cube currency='JPY' rate='168'/>")).toBeNull()
  })
})
