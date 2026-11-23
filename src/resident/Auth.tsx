import { useState } from 'react'
import { Lock, Mail } from 'lucide-react'
import { Button, Field, LogoMark, TextInput } from '../components/ui'
import { Screen, useNav } from './common'

export function Login() {
  const nav = useNav()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  return <Screen title="Sign in" large={false} onBack={() => nav.setStage('onboarding')} bottomPad={false}>
    <div className="space-y-5 px-5 py-6"><LogoMark size={60} />
      <p className="text-ink-2">Account sign-in is not connected yet.</p>
      <Field label="Email"><TextInput icon={Mail} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></Field>
      <Field label="Password"><TextInput icon={Lock} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></Field>
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
  return <Screen title="Create account" onBack={() => nav.setStage('login')}><div className="space-y-5 px-5"><p className="text-ink-2">Account registration and identity verification are not connected yet.</p><Button onClick={() => nav.setStage('app')}>Continue as guest</Button></div></Screen>
}

export function Forgot() {
  const nav = useNav()
  return <Screen title="Reset password" onBack={() => nav.setStage('login')}><p className="px-5 text-ink-2">Password reset is unavailable until account services are connected.</p></Screen>
}
