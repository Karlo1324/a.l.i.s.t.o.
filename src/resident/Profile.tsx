import { useEffect, useState } from 'react'
import { Bell, Info, LogOut, Monitor, Moon, Sun, User } from 'lucide-react'
import { Segmented } from './ResidentControls'
import { ProfileBarangaySettings } from '../components/ProfileBarangaySettings'
import { useStore } from '../store'
import { Group, Row, Screen, useNav } from './common'

export function Profile() {
  const nav = useNav()
  const { theme, setTheme, resident, signedIn, sessionCheck, retrySessionCheck, toast } = useStore()
  const [residentToken, setResidentToken] = useState<string | null>(null)
  const [tokenLoading, setTokenLoading] = useState(false)
  const [tokenError, setTokenError] = useState('')
  useEffect(() => {
    if (!signedIn) {
      setResidentToken(null)
      setTokenError('')
      return
    }
    let active = true
    setTokenLoading(true)
    setTokenError('')
    import('../lib/supabase').then(({ supabase }) => supabase.auth.getSession()).then(({ data, error }) => {
      if (error) throw error
      if (!data.session?.access_token) throw new Error('Your sign-in session is unavailable. Sign in again to request a barangay.')
      if (active) setResidentToken(data.session.access_token)
    }).catch(error => {
      if (active) setTokenError(error instanceof Error ? error.message : 'Could not load your sign-in session.')
    }).finally(() => {
      if (active) setTokenLoading(false)
    })
    return () => { active = false }
  }, [signedIn, resident.id])
  if (!signedIn && sessionCheck !== 'ready') return <Screen title="Profile">
    <div role="status" className="px-5">{sessionCheck === 'checking' ? 'Restoring your account…' :
      <button onClick={retrySessionCheck}>Could not load your account. Retry</button>}</div>
  </Screen>
  return <Screen title="Profile"><div className="space-y-6">
    <div className="mx-4 rounded-2xl bg-surface p-5"><User size={32} /><h2 className="mt-3 text-xl font-bold">{signedIn ? resident.name : 'Guest workspace'}</h2><p className="mt-2 text-sm text-ink-2">{signedIn ? resident.email || resident.phone : 'No account is signed in.'}</p></div>
    <Group header="Appearance">
      <div className="p-2">
        <Segmented full value={theme} onChange={setTheme}
          className="[&_[role=tab]]:h-11 [&_[role=tab]]:px-1 [&_[aria-selected=true]]:text-accent"
          options={[
            { value: 'light', label: <><Sun size={16} aria-hidden />Light</> },
            { value: 'dark', label: <><Moon size={16} aria-hidden />Dark</> },
            { value: 'system', label: <><Monitor size={16} aria-hidden />Auto</> },
          ]}
        />
      </div>
    </Group>
    <Group header="Account"><Row icon={<User size={17} />} label="Personal information" onClick={() => nav.push({name:'personal'})} /><Row icon={<Bell size={17} />} label="Notifications" onClick={() => nav.push({name:'notifSettings'})} /></Group>
    {signedIn && <Group header="Reporting area">
      <div className="p-3">
        {tokenLoading ? <p className="p-2 text-sm text-ink-2" role="status">Loading your sign-in session…</p>
          : residentToken ? <ProfileBarangaySettings token={residentToken} />
            : <p className="p-2 text-sm text-danger" role="alert">{tokenError || 'Your sign-in session is unavailable. Sign in again to request a barangay.'}</p>}
      </div>
    </Group>}
    <Group><Row icon={<Info size={17} />} label="Local records clear on refresh" /><Row icon={<LogOut size={17} />} label={signedIn ? 'Sign out' : 'Leave workspace'} onClick={async () => {
      if (signedIn) {
        try {
          const { supabase } = await import('../lib/supabase')
          const { error } = await supabase.auth.signOut({ scope: 'local' })
          if (error) throw error
        } catch { toast('Could not sign out. Please try again.', 'danger'); return }
      }
      nav.setStage('login')
    }} /></Group>
  </div></Screen>
}
export function NotifSettings() {
  const nav = useNav()
  return <Screen title="Notifications" large={false} onBack={nav.pop}><p className="px-5 text-ink-2">Report acceptance and rejection decisions appear here for signed-in residents. Push notifications, SMS, and email are not connected.</p></Screen>
}
export function PersonalInfo() {
  const nav = useNav()
  const { resident, signedIn } = useStore()
  return <Screen title="Personal information" large={false} onBack={nav.pop}>{signedIn ? <div className="space-y-3 px-5"><p>{resident.name}</p>{resident.email && <p>{resident.email}</p>}{resident.phone && <p>{resident.phone}</p>}</div> : <p className="px-5 text-ink-2">Sign in to see your account details.</p>}</Screen>
}
