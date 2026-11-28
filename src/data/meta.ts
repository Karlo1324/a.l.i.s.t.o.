import {
  Building,
  Construction,
  Mountain,
  TreePine,
  WavesHorizontal,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'

export type Category = 'flooding' | 'road' | 'building' | 'tree' | 'landslide' | 'electrical' | 'other'
export type Status = 'pending' | 'review' | 'verified' | 'assigned' | 'progress' | 'resolved' | 'rejected'
export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type Role = 'resident' | 'official' | 'admin'

export const CATEGORIES: Record<Category, { label: string; short: string; color: string; icon: LucideIcon; desc: string }> = {
  flooding: { label: 'Flooding', short: 'Flood', color: '#2f7cf6', icon: WavesHorizontal, desc: 'Rising water, clogged drains, submerged roads' },
  road: { label: 'Road Damage', short: 'Road', color: '#ef8a2b', icon: Construction, desc: 'Potholes, cracks, sinkholes, washed-out lanes' },
  building: { label: 'Building Damage', short: 'Building', color: '#b0683f', icon: Building, desc: 'Collapsed walls, roofs, structural cracks' },
  tree: { label: 'Fallen Trees', short: 'Tree', color: '#2e9e5b', icon: TreePine, desc: 'Uprooted trees or branches blocking the way' },
  landslide: { label: 'Landslides', short: 'Landslide', color: '#8a6a4c', icon: Mountain, desc: 'Soil erosion, rockfall, slope failure' },
  electrical: { label: 'Electrical Hazards', short: 'Electrical', color: '#d9a40b', icon: Zap, desc: 'Downed lines, sparking posts, exposed wiring' },
  other: { label: 'Other Infrastructure', short: 'Other', color: '#6b7a99', icon: Wrench, desc: 'Drainage, bridges, streetlights, facilities' },
}
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[]

export const STATUSES: Record<Status, { label: string; color: string; desc: string }> = {
  pending: { label: 'Pending', color: '#8d96aa', desc: 'Received and waiting for barangay review' },
  review: { label: 'Under Review', color: '#8b5cf6', desc: 'A barangay official is checking the details' },
  verified: { label: 'Verified', color: '#0ea5b7', desc: 'Confirmed as a valid incident' },
  assigned: { label: 'Assigned', color: '#3b6ef0', desc: 'A responder team has been dispatched' },
  progress: { label: 'In Progress', color: '#ef8a2b', desc: 'Responders are working on site' },
  resolved: { label: 'Resolved', color: '#22a06b', desc: 'The issue has been addressed' },
  rejected: { label: 'Rejected', color: '#e5372a', desc: 'Could not be validated or is out of scope' },
}
export const STATUS_KEYS = Object.keys(STATUSES) as Status[]
export const STATUS_FLOW: Status[] = ['pending', 'review', 'verified', 'assigned', 'progress', 'resolved']

export const PRIORITIES: Record<Priority, { label: string; color: string; sla: string }> = {
  critical: { label: 'Critical', color: '#e5372a', sla: '30 min' },
  high: { label: 'High', color: '#ef8a2b', sla: '2 hrs' },
  medium: { label: 'Medium', color: '#d9a40b', sla: '8 hrs' },
  low: { label: 'Low', color: '#5b8def', sla: '48 hrs' },
}
export const PRIORITY_KEYS = Object.keys(PRIORITIES) as Priority[]

export const ROLES: Record<Role, { label: string; color: string; desc: string }> = {
  resident: { label: 'Resident', color: '#5b8def', desc: 'Submit reports, track status, receive advisories' },
  official: { label: 'Responder (Official)', color: '#1f4fd1', desc: 'Verify incidents, dispatch responders, receive assignments and post field updates' },
  admin: { label: 'Administrator', color: '#e5372a', desc: 'Manage users, roles, permissions and system settings' },
}

export const PUROKS: string[] = []

export const BARANGAY = { name: '', city: '', region: '', hall: '', hotline: '' }
