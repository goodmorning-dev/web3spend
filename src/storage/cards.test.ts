import { afterEach, describe, expect, it } from 'vitest'
import { findCardByIdentity, getCard, listCards, putCard } from './cards'
import { resetDatabase } from './test-helpers'
import type { Card } from '@/types/card'

afterEach(resetDatabase)

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card-1',
    last4: '4242',
    cardHolderKey: 'jane doe',
    label: 'Card ••••4242',
    ...overrides,
  }
}

describe('cards repository', () => {
  it('round-trips a card by id', async () => {
    const card = makeCard()
    await putCard(card)

    expect(await getCard(card.id)).toEqual(card)
    expect(await listCards()).toEqual([card])
  })

  it('finds a card by its (last4, cardHolderKey) identity', async () => {
    const card = makeCard()
    await putCard(card)

    expect(await findCardByIdentity('4242', 'jane doe')).toEqual(card)
    expect(await findCardByIdentity('4242', 'someone else')).toBeUndefined()
    expect(await findCardByIdentity('0000', 'jane doe')).toBeUndefined()
  })
})
