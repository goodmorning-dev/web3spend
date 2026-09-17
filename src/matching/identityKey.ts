import Dexie from 'dexie'

export interface IdentityFields {
  cardId: string
  timestampUtc: string
  normalizedDescription: string
  amountMinor: number
  currency: string
}

/**
 * TECHNICAL-PLAN §6: hash of cardId + timestampUtc + normalizedDescription +
 * amountMinor + currency. SHA-256 (not a fast non-crypto hash) because a 32-bit
 * hash risks real collisions once a long-lived user has tens of thousands of rows.
 *
 * crypto.subtle.digest returns a native Promise that Dexie's transaction zone
 * doesn't track, so calling it inside a db.transaction() callback without
 * Dexie.waitFor causes a PrematureCommitError; waitFor is a no-op outside a
 * transaction, so it's safe to always apply here.
 */
export async function computeIdentityKey(fields: IdentityFields): Promise<string> {
  const input = [
    fields.cardId,
    fields.timestampUtc,
    fields.normalizedDescription,
    fields.amountMinor,
    fields.currency,
  ].join('|')
  const digest = await Dexie.waitFor(
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(input)),
  )
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
