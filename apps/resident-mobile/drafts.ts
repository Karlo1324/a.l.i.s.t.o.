import type { SQLiteDatabase } from 'expo-sqlite'

export const categories = [
  'Flooding', 'Road Damage', 'Building Damage', 'Fallen Trees',
  'Landslides', 'Electrical Hazards', 'Other Infrastructure',
] as const

export interface Draft {
  id: number
  title: string
  category: string
  description: string
  place: string
  photo: string | null
}

export async function initialize(db: SQLiteDatabase) {
  await db.execAsync(`CREATE TABLE IF NOT EXISTS drafts (
    id INTEGER PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL,
    description TEXT NOT NULL, place TEXT NOT NULL, photo TEXT
  )`)
}

export function listDrafts(db: SQLiteDatabase) {
  return db.getAllAsync<Pick<Draft, 'id' | 'title' | 'category'>>(
    'SELECT id, title, category FROM drafts ORDER BY id DESC'
  )
}

export function saveDraft(db: SQLiteDatabase, draft: Omit<Draft, 'id'>) {
  return db.runAsync(
    'INSERT INTO drafts (title, category, description, place, photo) VALUES (?, ?, ?, ?, ?)',
    draft.title.trim(), draft.category, draft.description.trim(), draft.place.trim(), draft.photo
  )
}
