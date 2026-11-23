import { useState } from 'react'
import { CircleCheck, Clock, Download, Inbox } from 'lucide-react'
import { BarChart, Donut } from '../components/Charts'
import { Button, EmptyState, Segmented } from '../components/ui'
import { CATEGORIES, CATEGORY_KEYS, STATUSES, STATUS_KEYS } from '../data/meta'
import { useStore } from '../store'
import { downloadCSV, Kpi, PageHeader, Panel } from './common'

export function Analytics() {
  const { incidents } = useStore()
  const [days, setDays] = useState('30')
  const cutoff = Date.now() - Number(days) * 86400000
  const list = incidents.filter((i) => i.createdAt.getTime() >= cutoff)
  const resolved = list.filter((i) => i.status === 'resolved')
  const responseMinutes = list.flatMap((i) => {
    const assigned = i.timeline.find((t) => t.status === 'assigned')
    const arrived = i.timeline.find((t) => t.status === 'progress' && (!assigned || t.at >= assigned.at))
    return assigned && arrived ? [(arrived.at.getTime()-assigned.at.getTime())/60000] : []
  })
  const categories = CATEGORY_KEYS.map((k) => ({ label:CATEGORIES[k].label, color:CATEGORIES[k].color, value:list.filter((i) => i.category === k).length })).filter((x) => x.value > 0)
  const statuses = STATUS_KEYS.map((s) => list.filter((i) => i.status === s).length)
  return <>
    <PageHeader title="Analytics" subtitle="Calculated from records entered in this workspace" actions={<><Segmented value={days} onChange={setDays} options={[{value:'7',label:'7D'},{value:'30',label:'30D'},{value:'90',label:'90D'},{value:'365',label:'1Y'}]} /><Button variant="secondary" icon={Download} disabled={!list.length} onClick={() => downloadCSV('alisto-analytics.csv', [['Status','Reports'],...STATUS_KEYS.map((s,i) => [STATUSES[s].label,statuses[i]])])}>Export</Button></>} />
    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      <Kpi label="Reports" value={list.length} icon={Inbox} color="#3b6ef0" />
      <Kpi label="Resolution rate" value={list.length ? `${Math.round(resolved.length/list.length*100)}%` : '—'} icon={CircleCheck} color="#22a06b" />
      <Kpi label="Average time to arrive" value={responseMinutes.length ? `${Math.round(responseMinutes.reduce((a,b)=>a+b,0)/responseMinutes.length)} min` : '—'} icon={Clock} color="#0ea5b7" />
    </div>
    {!list.length ? <Panel><EmptyState icon={Inbox} title="No data for this period" body="Charts will appear once reports are added. No sample metrics are included." /></Panel> : <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Reports by category"><div className="flex flex-wrap items-center gap-6"><Donut data={categories} center={{value:String(list.length),label:'reports'}} /><div className="space-y-2">{categories.map((c) => <div key={c.label} className="text-sm">{c.label}: {c.value}</div>)}</div></div></Panel>
      <Panel title="Current report status"><BarChart data={statuses} labels={STATUS_KEYS.map((s) => STATUSES[s].label)} highlightLast={false} /></Panel>
    </div>}
  </>
}
