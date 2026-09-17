import { db } from './db'
import type { Card } from '@/types/card'

export function listCards(): Promise<Card[]> {
  return db.cards.toArray()
}

export function getCard(id: string): Promise<Card | undefined> {
  return db.cards.get(id)
}

export function findCardByIdentity(
  last4: string,
  cardHolderKey: string,
): Promise<Card | undefined> {
  return db.cards.where({ last4, cardHolderKey }).first()
}

export function putCard(card: Card): Promise<string> {
  return db.cards.put(card)
}
