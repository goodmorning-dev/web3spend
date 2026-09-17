import { afterEach, describe, expect, it } from 'vitest'
import { db } from '@/storage/db'
import { resetDatabase } from '@/storage/test-helpers'
import { resolveCard } from './cardIdentity'

afterEach(resetDatabase)

describe('resolveCard', () => {
  it('creates a new card with a default label when none matches', async () => {
    const card = await resolveCard('4242', 'jane doe')

    expect(card.last4).toBe('4242')
    expect(card.cardHolderKey).toBe('jane doe')
    expect(card.label).toBe('Card ••••4242')
    expect(await db.cards.get(card.id)).toEqual(card)
  })

  it('reuses the existing card for the same (last4, cardHolderKey) identity', async () => {
    const first = await resolveCard('4242', 'jane doe')
    const second = await resolveCard('4242', 'jane doe')

    expect(second).toEqual(first)
    expect(await db.cards.count()).toBe(1)
  })

  it('preserves a user-edited label on subsequent resolutions', async () => {
    const card = await resolveCard('4242', 'jane doe')
    await db.cards.update(card.id, { label: 'My daily card' })

    const resolved = await resolveCard('4242', 'jane doe')

    expect(resolved.label).toBe('My daily card')
  })

  it('creates separate cards for different (last4, cardHolderKey) identities', async () => {
    const cardA = await resolveCard('4242', 'jane doe')
    const cardB = await resolveCard('4242', 'john doe')
    const cardC = await resolveCard('0000', 'jane doe')

    expect(new Set([cardA.id, cardB.id, cardC.id]).size).toBe(3)
  })
})
