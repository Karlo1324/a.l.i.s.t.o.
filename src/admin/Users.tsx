import { Users } from 'lucide-react'
import { EmptyState, RolePill } from '../components/ui'
import { ROLES, type Role } from '../data/meta'
import { useStore } from '../store'
import { ACCESS, PageHeader, Panel } from './common'

export function UsersPage() {
  const { staff } = useStore()
  return <>
    <PageHeader title="Users & Roles" subtitle="No account directory or invitation service is connected" />
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{(Object.keys(ROLES) as Role[]).map((role) => <div key={role} className="rounded-2xl bg-surface p-5 ring-1 ring-line"><RolePill role={role} /><div className="mt-3 text-3xl font-bold">{staff.filter((u) => u.role===role).length}</div></div>)}</div>
    <Panel title="Accounts">{!staff.length ? <EmptyState icon={Users} title="No accounts" body="Connect an account service to load staff and resident records. Invitations and password resets are unavailable." /> : <div className="divide-y divide-line">{staff.map((u) => <div key={u.id} className="flex items-center justify-between gap-4 py-4"><div><div className="font-semibold">{u.name}</div><div className="text-sm text-ink-3">{u.email}</div></div><RolePill role={u.role} /></div>)}</div>}</Panel>
    <div className="mt-6"><Panel title="Workspace views" subtitle="Screen access definitions; these do not authenticate users"><div className="space-y-4 pt-3">{(['official','responder','admin'] as const).map((role) => <div key={role}><RolePill role={role} /><p className="mt-2 text-sm text-ink-2">{ACCESS[role].join(', ')}</p></div>)}</div></Panel></div>
  </>
}
