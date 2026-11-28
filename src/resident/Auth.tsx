import { useState, type FormEvent } from 'react'
import { Lock, Mail, User, X } from 'lucide-react'
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
    <Screen title="Sign in" large={false} onBack={() => nav.setStage('onboarding')} bottomPad={false} className="auth-page">
      <form onSubmit={handleSignIn} className="auth-surface relative space-y-5 overflow-hidden rounded-2xl border border-line p-5 py-6 shadow-card">
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
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)

  async function handleSignUp(e: FormEvent) {
    e.preventDefault()
    if (!privacyAccepted) {
      setError('Please review and accept the Privacy Policy to create an account.')
      return
    }
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
    <Screen title="Create account" onBack={() => nav.setStage('login')} className="auth-page">
      <form onSubmit={handleSignUp} className="auth-surface relative space-y-5 overflow-hidden rounded-2xl border border-line p-5 py-6 shadow-card">
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

        <label className="flex items-start gap-2 text-sm text-ink-2">
          <input type="checkbox" className="mt-0.5 size-4 accent-accent" checked={privacyAccepted} onChange={e => setPrivacyAccepted(e.target.checked)} />
          <span>I agree to the <button type="button" className="font-semibold text-accent hover:underline" onClick={() => setPrivacyOpen(true)}>Privacy Policy</button>.</span>
        </label>

        <Button type="submit" disabled={loading || !fullName || !email || !password || !privacyAccepted} className="w-full">
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
      {privacyOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-5" role="presentation" onMouseDown={e => e.target === e.currentTarget && setPrivacyOpen(false)}>
        <section role="dialog" aria-modal="true" aria-labelledby="privacy-title" className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-5 shadow-pop">
          <div className="flex items-center justify-between gap-4"><h2 id="privacy-title" className="text-xl font-bold">Privacy Policy</h2><button type="button" aria-label="Close privacy policy" onClick={() => setPrivacyOpen(false)} className="grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-surface-2"><X size={18} /></button></div>
          <div className="mt-4 space-y-5 text-sm leading-relaxed text-ink-2">
            <p className="text-xs text-ink-3">Effective date: November 28, 2026</p>
            <section><h3 className="font-semibold text-ink">1. Who we are</h3><p className="mt-1">A.L.I.S.T.O. (Automated Local Incident &amp; Spatial Tracking Operations) is a community incident-reporting service operated by the responsible barangay or local organization. The organization that operates your workspace is the personal information controller for the information processed through it.</p></section>
            <section><h3 className="font-semibold text-ink">2. Information we collect</h3><p className="mt-1">We may collect your name, email address, phone number, account role, barangay assignment, authentication records, incident descriptions, report status, location or address, affected-person counts, and photos or other evidence that you choose to attach. We also collect technical information needed to keep the service secure and functioning.</p></section>
            <section><h3 className="font-semibold text-ink">3. Why we use it</h3><p className="mt-1">We use this information to create and secure accounts, receive and verify incident reports, locate and prioritize incidents, coordinate responders, send status updates and official broadcasts, prevent abuse, maintain audit records, and meet legal or public-safety obligations. We follow transparency, legitimate-purpose, and proportionality principles under the Philippine Data Privacy Act of 2012.</p></section>
            <section><h3 className="font-semibold text-ink">4. Location, photos, and sensitive details</h3><p className="mt-1">Location is collected only when you grant permission or choose a point manually. Photos and report details may contain personal information about you or other people. Do not upload information that is unrelated to the incident. We use submitted evidence for response and verification and restrict access according to role and barangay assignment.</p></section>
            <section><h3 className="font-semibold text-ink">5. Sharing</h3><p className="mt-1">Information may be shared with authorized barangay officials, responders, service providers that host or support the platform, and government or emergency authorities when required or reasonably necessary for safety, law enforcement, or legal compliance. We do not sell personal information.</p></section>
            <section><h3 className="font-semibold text-ink">6. Retention and deletion</h3><p className="mt-1">We retain information only as long as needed for incident response, account administration, audit, legal claims, public-safety records, or another lawful purpose. Retention periods may be set by the operating barangay or applicable law. When information is no longer needed, it is deleted, anonymized, or securely archived according to the organization’s retention procedures.</p></section>
            <section><h3 className="font-semibold text-ink">7. Security and incidents</h3><p className="mt-1">We use access controls, role restrictions, secure authentication, and protected storage appropriate to the service. No online service is completely risk-free. If a data breach creates a legally reportable risk, the responsible controller will follow applicable notification requirements.</p></section>
            <section><h3 className="font-semibold text-ink">8. Your rights</h3><p className="mt-1">Subject to applicable law and lawful limitations, you may ask to be informed, access or correct your information, object to or restrict processing, request deletion or blocking, request portability, withdraw consent where consent is the legal basis, and file a complaint with the National Privacy Commission. Contact the barangay administrator or designated Data Protection Officer to exercise a right.</p></section>
            <section><h3 className="font-semibold text-ink">9. Children</h3><p className="mt-1">The service is intended for people who can lawfully create an account. A parent or legal guardian should contact the administrator if a child’s information was submitted without appropriate authority.</p></section>
            <section><h3 className="font-semibold text-ink">10. Changes and contact</h3><p className="mt-1">We may update this policy when the service, law, or processing purposes change. The effective date above identifies the current version. For questions, corrections, deletion requests, or privacy complaints, contact your barangay administrator or the Data Protection Officer designated by the organization operating this workspace.</p></section>
            <p className="border-t border-line pt-3 text-xs text-ink-3">This notice describes the intended processing in this application. The organization operating your workspace should publish its official controller identity, contact details, retention schedule, and complaint process.</p>
          </div>
          <Button type="button" className="mt-5 w-full" onClick={() => { setPrivacyAccepted(true); setPrivacyOpen(false) }}>I understand and agree</Button>
        </section>
      </div>}
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
