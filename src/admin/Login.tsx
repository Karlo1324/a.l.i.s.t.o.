import { useState, type FormEvent } from 'react'
import { ArrowLeft, Mail, Phone } from 'lucide-react'
import { Button, Field, LogoMark, Segmented, TextInput } from '../components/ui'
import { PasswordField } from '../components/PasswordField'
import type { StaffSession } from '../lib/staffAuth'
import { ThemeToggle } from '../App'

export function StaffLogin({ onAuthenticated, onExit }: { onAuthenticated: (session: StaffSession) => void; onExit: () => void }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [method, setMethod] = useState<'email' | 'phone'>('email')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [warning, setWarning] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const password = String(new FormData(event.currentTarget).get('password') ?? '')
    setBusy(true)
    setError('')
    try {
      const { signInStaff } = await import('../lib/staffAuth')
      onAuthenticated(await signInStaff(method === 'phone' ? { phone } : { email: email.trim() }, password))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Staff sign-in is unavailable.')
    } finally {
      setBusy(false)
    }
  }
  return <div className="auth-page flex min-h-full flex-col">
    <header className="flex items-center justify-between p-6">
      <button onClick={onExit} className="flex items-center gap-2 text-ink-2"><ArrowLeft size={18} /> Home</button>
      <ThemeToggle />
    </header>
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-16">
      <LogoMark size={56} />
      <h1 className="mt-6 text-3xl font-bold">Staff sign in</h1>
      <p className="mt-3 text-ink-2">Sign in with your assigned staff account.</p>
      <form className="auth-surface relative mt-6 space-y-4 overflow-hidden rounded-2xl border border-line p-5 shadow-card" onSubmit={submit}>
        <Segmented full value={method} onChange={setMethod} options={[{ value: 'email', label: 'Work email' }, { value: 'phone', label: 'Phone number' }]} />
        {method === 'email' ? (
          <Field label="Work email"><TextInput icon={Mail} placeholder="Email" type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} /></Field>
        ) : (
          <Field label="Phone number"><TextInput icon={Phone} type="tel" required autoComplete="tel" placeholder="+639171234567" value={phone}
            onChange={e => {
              const cleaned = e.target.value.replace(/[^0-9+]/g, '').replace(/(?!^)\+/g, '')
              setWarning(cleaned !== e.target.value)
              setPhone(cleaned)
            }} /></Field>
        )}
        {method === 'phone' && warning && <p role="alert" className="text-sm text-danger">Use digits only, with an optional + at the start.</p>}
        <PasswordField />
        {error && <p role="alert" className="text-danger">{error}</p>}
        <Button type="submit" loading={busy} className="w-full">Sign in</Button>
      </form>
    </main>
  </div>
}
