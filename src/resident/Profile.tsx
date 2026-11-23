import { Bell, Info, LogOut, Moon, User } from 'lucide-react'
import { Segmented } from '../components/ui'
import { useStore } from '../store'
import { Group, Row, Screen, useNav } from './common'

export function Profile() {
  const nav = useNav()
  const { theme, setTheme } = useStore()
  return <Screen title="Profile"><div className="space-y-6">
    <div className="mx-4 rounded-2xl bg-surface p-5"><User size={32} /><h2 className="mt-3 text-xl font-bold">Guest workspace</h2><p className="mt-2 text-sm text-ink-2">No account is signed in. Account details and residency verification are unavailable.</p></div>
    <Group header="Appearance"><div className="flex items-center justify-between gap-3 p-4"><Moon size={20} /><Segmented value={theme} onChange={setTheme} options={[{value:'light',label:'Light'},{value:'dark',label:'Dark'},{value:'system',label:'Auto'}]} /></div></Group>
    <Group header="Account"><Row icon={<User size={17} />} label="Personal information" onClick={() => nav.push({name:'personal'})} /><Row icon={<Bell size={17} />} label="Notifications" onClick={() => nav.push({name:'notifSettings'})} /></Group>
    <Group><Row icon={<Info size={17} />} label="Local records clear on refresh" /><Row icon={<LogOut size={17} />} label="Leave workspace" onClick={() => nav.setStage('login')} /></Group>
  </div></Screen>
}
export function NotifSettings() {
  const nav = useNav()
  return <Screen title="Notifications" large={false} onBack={nav.pop}><p className="px-5 text-ink-2">Push notifications, SMS, and email are not connected. Updates made in this workspace appear in its notification list.</p></Screen>
}
export function PersonalInfo() {
  const nav = useNav()
  return <Screen title="Personal information" large={false} onBack={nav.pop}><p className="px-5 text-ink-2">No profile is available. Connect an account service to manage personal information.</p></Screen>
}
