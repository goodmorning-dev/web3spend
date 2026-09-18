import { deleteAllData } from './deleteAllData'

export async function resetDatabase(): Promise<void> {
  await deleteAllData()
}
