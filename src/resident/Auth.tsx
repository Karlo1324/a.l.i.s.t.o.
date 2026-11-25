import { useState, type FormEvent } from 'react'
import { Mail, Phone } from 'lucide-react'
import { Button, Field, LogoMark, Segmented, TextInput } from '../components/ui'
import { PasswordField } from '../components/PasswordField'
import { useStore } from '../store'
import { Screen, useNav } from './common'

export function Login() {
  const nav = useNav()
  const { signedIn, applyResidentUser } = useStore()
  const [method, setMethod] = useState<'email' | 'phone'>('email')
  const [phone, setPhone] = useState('')
  const [phoneWarning, setPhoneWarning] = useState(false)
  function updatePhone(input: string) {
    const cleaned = input.replace(/[^0-9+]/g, '').replace(/(?!^)\+/g, '')
    setPhone(cleaned)
    setPhoneWarning(cleaned !== input)
  }
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    const password = String(new FormData(event.currentTarget).get('password') ?? '')
    if (!password) { setError('Enter your password.'); return }
    if (method === 'phone' && !/^\+[1-9][0-9]{6,14}$/.test(phone)) {
      setError('Enter your phone number with the country code, such as +63.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { supabase } = await import('../lib/supabase')
      const credentials = method === 'email' ? { email: email.trim(), password } : { phone, password }
      const { data, error: signInError } = await supabase.auth.signInWithPassword(credentials)
      if (signInError) throw signInError
      if (!data.session?.user) throw new Error('Could not confirm your session. Please sign in again.')
      applyResidentUser(data.session.user)
      nav.setStage('app')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Try again.')
    } finally {
      setLoading(false)
    }
  }
  return <Screen title="Sign in" large={false} onBack={() => nav.setStage('onboarding')} bottomPad={false}>
    <form className="space-y-5 px-5 py-6" onSubmit={signIn}>
      <LogoMark size={60} />
      <Segmented full value={method} onChange={setMethod} options={[
        { value: 'email', label: 'Email' },
        { value: 'phone', label: 'Phone number' },
      ]} />
      {method === 'email' ? (
        <Field label="Email"><TextInput icon={Mail} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></Field>
      ) : (
        <Field label="Phone number"><TextInput icon={Phone} type="tel" inputMode="tel" placeholder="+639171234567" value={phone} onChange={(e) => updatePhone(e.target.value)} autoComplete="tel" required aria-describedby={phoneWarning ? 'resident-phone-warning' : undefined} /></Field>
      )}
      {method === 'phone' && phoneWarning && (
        <p id="resident-phone-warning" role="alert" className="text-sm text-danger">
          Use digits only, with an optional + at the start for the country code.
        </p>
      )}
      <PasswordField />
      {error && <p role="alert" className="text-danger">{error}</p>}
      <Button type="submit" loading={loading} className="w-full">Sign in</Button>
      <p className="text-center text-sm text-ink-2">
        Don’t have an account?{' '}
        <button type="button" className="font-semibold text-accent underline" onClick={() => nav.setStage('register')}>Sign up</button>
      </p>
      <Button type="button" variant="secondary" className="w-full" disabled={loading} onClick={async () => {
        if (signedIn) {
          try {
            const { supabase } = await import('../lib/supabase')
            const { error } = await supabase.auth.signOut({ scope: 'local' })
            if (error) throw error
          } catch { setError('Could not leave the signed-in account. Please try again.'); return }
        }
        nav.setStage('app')
      }}>Continue as guest</Button>
      <p className="text-sm text-ink-3">Guest reports stay in this workspace until you refresh. No account is created.</p>
    </form>
  </Screen>
}

function estimateStrength(password: string) {
  const variety = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(pattern => pattern.test(password)).length
  if (password.length < 8 || new Set(password).size < 5 || /password|qwerty|123456/i.test(password)) return 'Weak'
  if (password.length >= 16 || (password.length >= 12 && variety >= 3)) return 'Strong'
  return 'Moderate'
}

export function Register() {
  const { applyResidentUser } = useStore()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const strength = password ? estimateStrength(password) : null
  const meter = strength && {
    Weak: { count: 1, color: 'bg-red-500' },
    Moderate: { count: 2, color: 'bg-amber-500' },
    Strong: { count: 3, color: 'bg-emerald-500' },
  }[strength]
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
    if (fields.get('password') !== fields.get('confirmPassword')) {
      setError('Enter the same password in both fields.')
      return
    }
    if (!name) { setError('Enter your full name.'); return }
    setLoading(true)
    setError('')
    try {
      const { supabase } = await import('../lib/supabase')
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: String(fields.get('email')).trim(),
        password: String(fields.get('password')),
        options: {
          data: { full_name: name, phone: phone || null },
          emailRedirectTo: new URL(window.location.pathname, window.location.origin).href,
        },
      })
      if (signUpError?.code === 'over_email_send_rate_limit') {
        setError('We’ve reached the signup email limit. Please try again later.')
        return
      }
      if (signUpError) throw signUpError
      if (!data.session) setSuccess('Check your email for a confirmation link.')
      else {
        applyResidentUser(data.session.user)
        nav.setStage('app')
      }
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
      <PasswordField creating onValueChange={setPassword} />
      <p className="text-sm text-ink-2">Use at least 8 characters.</p>
      <div className="space-y-1.5">
        <div aria-hidden="true" className="flex gap-1.5">
          {[1, 2, 3].map(segment => (
            <span key={segment} className={`h-1.5 flex-1 rounded-full transition-colors ${meter && segment <= meter.count ? meter.color : 'bg-surface-3'}`} />
          ))}
        </div>
        <p role="status" className="text-sm font-semibold">{strength && `Estimated password strength: ${strength}`}</p>
      </div>
      <PasswordField creating label="Confirm password" name="confirmPassword" onValueChange={setConfirmation} />
      <p role="status" className="text-sm">{confirmation && (password === confirmation ? 'Passwords match.' : 'Passwords do not match.')}</p>
      {error && <p role="alert" className="text-danger">{error}</p>}
      <Button type="submit" loading={loading} className="w-full">Create resident account</Button>
    </form>}
  </Screen>
}

export function Forgot() {
  const nav = useNav()
  return <Screen title="Reset password" onBack={() => nav.setStage('login')}><p className="px-5 text-ink-2">Password reset is unavailable until account services are connected.</p></Screen>
}
