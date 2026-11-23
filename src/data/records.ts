import type { Category, Priority, Role, Status } from './meta'

export interface TimelineEntry {
  status: Status
  at: Date
  note: string
  by: string
}

export interface AISuggestion {
  category: Category
  confidence: number
  alts: { category: Category; confidence: number }[]
  severity: 'Low' | 'Moderate' | 'High' | 'Severe'
  tags: string[]
  summary: string
}

export interface Incident {
  id: string
  code: string
  category: Category
  title: string
  description: string
  status: Status
  priority?: Priority
  reporter: { id: string; name: string; phone: string; verified: boolean }
  anonymous?: boolean
  address: string
  purok: string
  landmark?: string
  x: number
  y: number
  lat: number
  lng: number
  photos: string[]
  createdAt: Date
  updatedAt: Date
  assignee?: string
  ai?: AISuggestion
  duplicates?: string[]
  timeline: TimelineEntry[]
  affected: number
  confirmations: number
  danger?: boolean
  rejectReason?: string
  progress?: number
  checklist?: { label: string; done: boolean }[]
}

export interface Responder {
  id: string
  name: string
  team: string
  title: string
  status: 'available' | 'on-task' | 'off-duty'
  skills: Category[]
  x: number
  y: number
  phone: string
  vehicle: string
  rating: number
}

export interface Announcement {
  id: string
  level: 'critical' | 'warning' | 'info' | 'community'
  title: string
  body: string
  source: string
  at: Date
  image?: string
}

export interface ResidentNotification {
  id: string
  kind: 'status' | 'announcement' | 'alert' | 'community'
  title: string
  body: string
  at: Date
  read: boolean
  incidentId?: string
  announcementId?: string
  status?: Status
}

export interface StaffUser {
  id: string
  name: string
  email: string
  role: Role
  title: string
  status: 'active' | 'invited' | 'suspended'
  mfa: boolean
  lastActive: Date
  purok?: string
}

export interface AuditEntry {
  id: string
  actor: string
  role: Role
  action: string
  type: 'auth' | 'incident' | 'assignment' | 'user' | 'settings' | 'ai'
  target: string
  ip: string
  at: Date
}

export interface StaffNotification {
  id: string
  tone: 'critical' | 'warning' | 'info' | 'success'
  title: string
  body: string
  at: Date
  read: boolean
  incidentId?: string
}

// No records are seeded. These collections remain empty until a data source is connected.
export const INITIAL_INCIDENTS: Incident[] = []
export const INITIAL_AUDIT: AuditEntry[] = []
export const INITIAL_RESIDENT_NOTIFS: ResidentNotification[] = []
export const INITIAL_STAFF_NOTIFS: StaffNotification[] = []
export const RESPONDERS: Responder[] = []
export const STAFF: StaffUser[] = []
export const ANNOUNCEMENTS: Announcement[] = []
export const LANDMARKS: { id: string; label: string; x: number; y: number; kind: 'hall' | 'health' | 'evac' }[] = []

// This identifies reports entered in the local workspace, not an authenticated account.
export const LOCAL_RESIDENT = { id: 'local-workspace', name: 'Guest', first: 'Guest', phone: '', email: '', purok: '', address: '', memberSince: '' }
