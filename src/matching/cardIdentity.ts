import { db } from '@/storage/db'
import type { Card } from '@/types/card'

/**
 * TECHNICAL-PLAN §6: a Card's default identity is (last4, normalizedCardHolderName).
 * A row whose (last4, holder) doesn't match any existing Card creates one
 * automatically; no ambiguous-match prompt in the MVP for a last-4 collision.
 */
export async function resolveCard(last4: string, cardHolderKey: string): Promise<Card> {
  const existing = await db.cards.where({ last4, cardHolderKey }).first()
  if (existing) {
    return existing
  }

  const card: Card = {
    id: crypto.randomUUID(),
    last4,
    cardHolderKey,
    label: `Card ••••${last4}`,
  }
  await db.cards.put(card)
  return card
}
