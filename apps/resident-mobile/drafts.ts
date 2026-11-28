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
  photos?: string[]
  photo: string | null
}

export async function initialize(db: SQLiteDatabase) {
  await db.execAsync(`CREATE TABLE IF NOT EXISTS drafts (
    id INTEGER PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL,
    description TEXT NOT NULL, place TEXT NOT NULL, photo TEXT
  )`)
  await db.execAsync("CREATE TABLE IF NOT EXISTS deliveries (draft INTEGER PRIMARY KEY, owner TEXT NOT NULL, uuid TEXT NOT NULL UNIQUE, reference TEXT)")
  await db.execAsync("CREATE TABLE IF NOT EXISTS draft_details (draft INTEGER PRIMARY KEY, owner TEXT, options TEXT, extra_photos TEXT)")
  await db.execAsync("CREATE TABLE IF NOT EXISTS preferences (name TEXT PRIMARY KEY, value TEXT NOT NULL)")
}

export function listDrafts(db: SQLiteDatabase) {
  return db.getAllAsync<Pick<Draft, 'id' | 'title' | 'category'> & {reference: string | null}>(
    'SELECT id, title, category, reference FROM drafts LEFT JOIN deliveries ON deliveries.draft=drafts.id ORDER BY id DESC'
  )
}

export function saveDraft(db: SQLiteDatabase, draft: Omit<Draft, 'id'>) {
  return db.runAsync(
    'INSERT INTO drafts (title, category, description, place, photo) VALUES (?, ?, ?, ?, ?)',
    draft.title.trim(), draft.category, draft.description.trim(), draft.place.trim(), draft.photo
  )
}

export type Submission = {coordinates:string; gps:boolean; affected:number; danger:boolean; anonymous:boolean}
export async function storeSubmission(db:SQLiteDatabase, draft:Omit<Draft,'id'>, owner:string|null, options:Submission, existingId?:number){
 let id=0
 await db.withExclusiveTransactionAsync(async tx=>{
   if(existingId){
     const res=await tx.runAsync('UPDATE drafts SET category=?,title=?,description=?,place=?,photo=? WHERE id=?',draft.category,draft.title,draft.description,draft.place,draft.photos?.[0]||null,existingId)
     if(res.changes!==1)throw Error('The draft is no longer available.')
     id=existingId
   }else{
     const result=await saveDraft(tx,{...draft,photo:draft.photos?.[0]||null})
     id=result.lastInsertRowId
   }
   await tx.runAsync('INSERT OR REPLACE INTO draft_details(draft,owner,options,extra_photos) VALUES(?,?,?,?)',
     id,owner,JSON.stringify(options),JSON.stringify(draft.photos?.slice(1)||[]))
 })
 return id
}
export async function deviceDrafts(db:SQLiteDatabase,owner:string|null){
 const rows=await db.getAllAsync<Draft & {options:string|null;extra_photos:string|null; locked:number}>(`SELECT d.*, x.options,x.extra_photos,v.uuid IS NOT NULL AS locked FROM drafts d
 LEFT JOIN draft_details x ON x.draft=d.id LEFT JOIN deliveries v ON v.draft=d.id
 WHERE v.reference IS NULL AND coalesce(x.owner,v.owner) IS ? ORDER BY d.id DESC`,owner)
 return rows.map(row=>({...row,photos:[...(row.photo?[row.photo]:[]),...JSON.parse(row.extra_photos||'[]')],
   options:row.options?JSON.parse(row.options) as Submission:null}))
}
