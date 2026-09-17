import { db } from './db'
import type { StandardTransaction } from '@/types/transaction'

export function listTransactions(): Promise<StandardTransaction[]> {
  return db.transactions.toArray()
}

export function getTransaction(id: string): Promise<StandardTransaction | undefined> {
  return db.transactions.get(id)
}

export function findTransactionByIdentityKey(
  identityKey: string,
): Promise<StandardTransaction | undefined> {
  return db.transactions.where('identityKey').equals(identityKey).first()
}

export function putTransaction(transaction: StandardTransaction): Promise<string> {
  return db.transactions.put(transaction)
}

export function bulkPutTransactions(transactions: StandardTransaction[]): Promise<string> {
  return db.transactions.bulkPut(transactions)
}
