import { useState, type FormEvent } from 'react'
import { Lock, Mail, User } from 'lucide-react'
import { Button, Field, LogoMark, TextInput } from '../components/ui'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import { Screen, useNav } from './common'

export function Login() {
  const nav = useNav()
  const { applyResidentUser } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignIn(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    applyResidentUser(data.session.user)
    nav.setStage('app')
  }

  return (
    <Screen title="Sign in" large={false} onBack={() => nav.setStage('onboarding')} bottomPad={false}>
      <form onSubmit={handleSignIn} className="space-y-5 px-5 py-6">
        <LogoMark size={60} />

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        )}

        <Field label="Email">
          <TextInput
            icon={Mail}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </Field>

        <Field label="Password">
          <TextInput
            icon={Lock}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>

        <Button type="submit" disabled={loading || !email || !password} className="w-full">
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>

        <p className="text-center text-sm text-ink-2">
          Don’t have an account?{' '}
          <button
            type="button"
            className="font-semibold text-accent underline"
            onClick={() => nav.setStage('register')}
          >
            Sign up
          </button>
        </p>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={loading}
          onClick={async () => {
            const { error } = await supabase.auth.signOut({ scope: 'local' })
            if (error) { setError(error.message); return }
            applyResidentUser(null)
            nav.setStage('app')
          }}
        >
          Continue as guest
        </Button>

        <p className="text-sm text-ink-3">
          Guest reports stay in this workspace until you refresh. No account is created.
        </p>
      </form>
    </Screen>
  )
}

export function Register() {
  const nav = useNav()
  const { applyResidentUser, toast } = useStore()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accountType, setAccountType] = useState<'resident' | 'responder'>('resident')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignUp(e: FormEvent) {
    e.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), requested_role: accountType === 'responder' ? 'OFFICIAL' : 'RESIDENT' },
        emailRedirectTo: new URL('./', window.location.href).href,
      },
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    if (!data.session) {
      setNotice(accountType === 'responder'
        ? 'Check your email to confirm your account. Responder access will remain pending until an administrator approves the request.'
        : 'Check your email to confirm your account.')
      return
    }

    applyResidentUser(data.session.user)
    if (accountType === 'responder') toast('Responder access requested. An administrator must approve it before staff access is enabled.')
    nav.setStage('app')
  }

  return (
    <Screen title="Create account" onBack={() => nav.setStage('login')}>
      <form onSubmit={handleSignUp} className="space-y-5 px-5 py-6">
        <LogoMark size={60} />

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        )}

        {notice && (
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-500">
            {notice}
          </p>
        )}

        <Field label="Full name">
          <TextInput
            icon={User}
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            required
          />
        </Field>

        <Field label="Email">
          <TextInput
            icon={Mail}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </Field>

        <Field label="Account type">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-1 ring-1 ring-line" role="group" aria-label="Account type">
            {(['resident', 'responder'] as const).map(type => (
              <button
                key={type}
                type="button"
                aria-pressed={accountType === type}
                onClick={() => setAccountType(type)}
                className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition ${accountType === type ? 'bg-surface text-accent shadow-sm' : 'text-ink-2 hover:bg-surface'}`}
              >
                {type === 'resident' ? 'Resident' : 'Responder'}
              </button>
            ))}
          </div>
          {accountType === 'responder' && <p className="mt-2 text-sm text-ink-3">Responder access requires administrator approval. Until approved, this account remains a resident.</p>}
        </Field>

        <Field label="Password">
          <TextInput
            icon={Lock}
            type="password"
            placeholder="Password (min. 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </Field>

        <Button type="submit" disabled={loading || !fullName || !email || !password} className="w-full">
          {loading ? 'Creating account...' : 'Create account'}
        </Button>

        <p className="text-center text-sm text-ink-2">
          Already have an account?{' '}
          <button
            type="button"
            className="font-semibold text-accent underline"
            onClick={() => nav.setStage('login')}
          >
            Sign in
          </button>
        </p>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={loading}
          onClick={async () => {
            const { error } = await supabase.auth.signOut({ scope: 'local' })
            if (error) { setError(error.message); return }
            applyResidentUser(null)
            nav.setStage('app')
          }}
        >
          Continue as guest
        </Button>
      </form>
    </Screen>
  )
}

export function Forgot() {
  const nav = useNav()
  return (
    <Screen title="Reset password" onBack={() => nav.setStage('login')}>
      <p className="px-5 text-ink-2">
        Password reset is unavailable until account services are connected.
      </p>
    </Screen>
  )
}