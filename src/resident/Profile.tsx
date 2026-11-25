import { Bell, Info, LogOut, Monitor, Moon, Sun, User } from 'lucide-react'
import { Segmented } from '../components/ui'
import { useStore } from '../store'
import { Group, Row, Screen, useNav } from './common'

export function Profile() {
  const nav = useNav()
  const { theme, setTheme, resident, signedIn, toast } = useStore()
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
  return <Screen title="Notifications" large={false} onBack={nav.pop}><p className="px-5 text-ink-2">Push notifications, SMS, and email are not connected. Updates made in this workspace appear in its notification list.</p></Screen>
}
export function PersonalInfo() {
  const nav = useNav()
  const { resident, signedIn } = useStore()
  return <Screen title="Personal information" large={false} onBack={nav.pop}>{signedIn ? <div className="space-y-3 px-5"><p>{resident.name}</p>{resident.email && <p>{resident.email}</p>}{resident.phone && <p>{resident.phone}</p>}</div> : <p className="px-5 text-ink-2">Sign in to see your account details.</p>}</Screen>
}
