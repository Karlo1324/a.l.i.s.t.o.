import { useState } from 'react'
import { ArrowLeft, Lock, Mail } from 'lucide-react'
import { Button, Field, LogoMark, Segmented, TextInput } from '../components/ui'
import { ROLES, type Role } from '../data/meta'
import { ThemeToggle } from '../App'

type StaffRole = Exclude<Role, 'resident'>

export function StaffLogin({ onDone, onExit }: { onDone: (r: StaffRole) => void; onExit: () => void }) {
  const [role, setRole] = useState<StaffRole>('official')
  return <div className="flex min-h-full flex-col">
    <header className="flex items-center justify-between p-6">
      <button onClick={onExit} className="flex items-center gap-2 text-ink-2"><ArrowLeft size={18} /> Home</button>
      <ThemeToggle />
    </header>
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-16">
      <LogoMark size={56} />
      <h1 className="mt-6 text-3xl font-bold">Staff sign in</h1>
      <p className="mt-3 text-ink-2">Account sign-in and two-factor authentication are not connected yet.</p>
      <div className="mt-6 space-y-4">
        <Field label="Work email"><TextInput icon={Mail} placeholder="Email" type="email" autoComplete="username" /></Field>
        <Field label="Password"><TextInput icon={Lock} placeholder="Password" type="password" autoComplete="current-password" /></Field>
        <Button disabled className="w-full">Sign in unavailable</Button>
      </div>
      <div className="mt-8 border-t border-line pt-6">
        <h2 className="font-semibold">Local workspace</h2>
        <p className="mt-2 text-sm text-ink-2">Explore the screens and enter local records. Nothing is sent to a server, and records clear when you refresh.</p>
        <div className="mt-4"><Segmented full value={role} onChange={setRole} options={[{ value: 'official', label: 'Official' }, { value: 'responder', label: 'Responder' }, { value: 'admin', label: 'Administrator' }]} /></div>
        <p className="mt-2 text-xs text-ink-3">{ROLES[role].desc}</p>
        <Button variant="secondary" className="mt-4 w-full" onClick={() => onDone(role)}>Open local workspace</Button>
      </div>
    </main>
  </div>
}
