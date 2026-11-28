import { useState } from 'react'
import { Building, Palette, ShieldCheck, Sparkles, User } from 'lucide-react'
import { Segmented } from '../components/ui'
import { ProfileBarangaySettings } from '../components/ProfileBarangaySettings'
import { useStore } from '../store'
import { PageHeader, Panel, useAdmin } from './common'

export function SettingsPage() {
  const { theme, setTheme } = useStore()
  const ctx = useAdmin()
  const [section, setSection] = useState('appearance')
  const tabs = [{value:'appearance',label:'Appearance',icon:Palette},{value:'profile',label:'Profile',icon:User},{value:'security',label:'Security',icon:ShieldCheck},{value:'ai',label:'AI assistance',icon:Sparkles},{value:'system',label:'System',icon:Building}]
  return <>
    <PageHeader title="Settings" subtitle="Workspace preferences and service availability" />
    <div className="grid gap-6 md:grid-cols-[200px_1fr]"><nav className="space-y-2">{tabs.map((t) => <button key={t.value} onClick={() => setSection(t.value)} className={`flex w-full items-center gap-2 rounded-xl p-3 text-left ${section===t.value?'bg-surface shadow-card':'text-ink-2'}`}><t.icon size={18} />{t.label}</button>)}</nav>
      <Panel title={tabs.find((t)=>t.value===section)?.label}>
        {section==='appearance' && <div className="space-y-4 pt-3"><p className="text-sm text-ink-2">Saved on this device.</p><Segmented value={theme} onChange={setTheme} options={[{value:'light',label:'Light'},{value:'dark',label:'Dark'},{value:'system',label:'Automatic'}]} /></div>}
        {section==='profile' && <div className="pt-3"><ProfileBarangaySettings token={ctx.token} /></div>}
        {section==='security' && <p className="pt-3 text-ink-2">Authentication, MFA, password management, and device sessions are not connected.</p>}
        {section==='ai' && <div className="space-y-5 pt-3"><p className="text-ink-2">No AI service is connected. Reports do not receive generated classifications or confidence scores.</p><label className="block text-sm">Nearby report search radius: {ctx.settings.dupRadius} m<input className="mt-3 block w-full accent-accent" type="range" min={50} max={500} step={25} value={ctx.settings.dupRadius} onChange={(e)=>ctx.setSettings({dupRadius:Number(e.target.value)})} /></label></div>}
        {section==='system' && <p className="pt-3 text-ink-2">No organization, verified contact directory, notification service, or server monitoring is configured. Records are kept in memory for this workspace only.</p>}
      </Panel>
    </div>
  </>
}
