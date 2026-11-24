import { useState, type FormEvent } from 'react'
import { Mail, Phone } from 'lucide-react'
import { Button, Field, LogoMark, Segmented, TextInput } from '../components/ui'
import { PasswordField } from '../components/PasswordField'
import { Screen, useNav } from './common'

export function Login() {
  const nav = useNav()
  const [method, setMethod] = useState<'email' | 'phone'>('email')
  const [phone, setPhone] = useState('')
  const [phoneWarning, setPhoneWarning] = useState(false)
  function updatePhone(input: string) {
    const cleaned = input.replace(/[^0-9+]/g, '').replace(/(?!^)\+/g, '')
    setPhone(cleaned)
    setPhoneWarning(cleaned !== input)
  }
  const [email, setEmail] = useState('')
  return <Screen title="Sign in" large={false} onBack={() => nav.setStage('onboarding')} bottomPad={false}>
    <div className="space-y-5 px-5 py-6"><LogoMark size={60} />
      <p className="text-ink-2">Account sign-in is not connected yet.</p>
      <Segmented full value={method} onChange={setMethod} options={[
        { value: 'email', label: 'Email' },
        { value: 'phone', label: 'Phone number' },
      ]} />
      {method === 'email' ? (
        <Field label="Email"><TextInput icon={Mail} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></Field>
      ) : (
        <Field label="Phone number"><TextInput icon={Phone} type="tel" inputMode="tel" placeholder="+639171234567" value={phone} onChange={(e) => updatePhone(e.target.value)} autoComplete="tel" aria-describedby={phoneWarning ? 'resident-phone-warning' : undefined} /></Field>
      )}
      {method === 'phone' && phoneWarning && (
        <p id="resident-phone-warning" role="alert" className="text-sm text-danger">
          Use digits only, with an optional + at the start for the country code.
        </p>
      )}
      <PasswordField />
      <Button disabled className="w-full">Sign in unavailable</Button>
      <p className="text-center text-sm text-ink-2">
        Don’t have an account?{' '}
        <button type="button" className="font-semibold text-accent underline" onClick={() => nav.setStage('register')}>Sign up</button>
      </p>
      <Button variant="secondary" className="w-full" onClick={() => nav.setStage('app')}>Continue as guest</Button>
      <p className="text-sm text-ink-3">Guest reports stay in this workspace until you refresh. No account is created.</p>
    </div>
  </Screen>
}

export function Register() {
  const nav = useNav()
  const [phone, setPhone] = useState('')
  const [warning, setWarning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    const fields = new FormData(event.currentTarget)
    const name = String(fields.get('fullName')).trim()
    if (!name) { setError('Enter your full name.'); return }
    setLoading(true)
    setError('')
    try {
      const { registerResident } = await import('../lib/registerResident')
      setSuccess(await registerResident(String(fields.get('email')).trim(), String(fields.get('password')), name, phone))
    } catch (err) {
      setError(err instanceof TypeError ? 'Could not reach registration. Check your connection and try again.' :
        err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return <Screen title="Create account" onBack={() => nav.setStage('login')}>
    {success ? <div className="space-y-5 px-5">
      <p role="status">{success}</p>
      <Button onClick={() => nav.setStage('login')}>Back to sign in</Button>
    </div> : <form className="space-y-4 px-5" onSubmit={submit}>
      <Field label="Full name"><TextInput name="fullName" placeholder="Enter your full name" required autoComplete="name" /></Field>
      <Field label="Email"><TextInput name="email" type="email" placeholder="you@example.com" required autoComplete="email" /></Field>
      <Field label="Contact phone (optional)"><TextInput type="tel" placeholder="+639171234567" autoComplete="tel" value={phone}
        pattern="[+]?[0-9]{7,15}" title="Enter 7 to 15 digits with an optional leading +"
        onChange={e => {
          const cleaned = e.target.value.replace(/[^0-9+]/g, '').replace(/(?!^)\+/g, '')
          setWarning(cleaned !== e.target.value)
          setPhone(cleaned)
        }} /></Field>
      {warning && <p role="alert">Use digits only, with an optional + at the start.</p>}
      <PasswordField creating />
      <p className="text-sm text-ink-2">Use at least 8 characters.</p>
      {error && <p role="alert" className="text-danger">{error}</p>}
      <Button type="submit" loading={loading} className="w-full">Create resident account</Button>
    </form>}
  </Screen>
}

export function Forgot() {
  const nav = useNav()
  return <Screen title="Reset password" onBack={() => nav.setStage('login')}><p className="px-5 text-ink-2">Password reset is unavailable until account services are connected.</p></Screen>
}
