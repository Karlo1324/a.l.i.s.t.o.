import { useState, type FormEvent } from 'react'
import { Lock, Mail, User } from 'lucide-react'
import { Button, Field, LogoMark, TextInput } from '../components/ui'
import { supabase } from '../lib/supabase'
import { Screen, useNav } from './common'

export function Login() {
  const nav = useNav()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignIn(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

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
          onClick={() => nav.setStage('app')}
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
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
        data: { full_name: fullName.trim() },
        emailRedirectTo: window.location.origin + '/',
      },
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    if (!data.session) {
      setNotice('Check your email to confirm your account.')
      return
    }

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
          onClick={() => nav.setStage('app')}
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