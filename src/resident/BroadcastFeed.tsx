import { useEffect, useState } from 'react'

interface Broadcast { id: string; title: string; body: string; published_at: string }

export function BroadcastFeed() {
  const [items, setItems] = useState<Broadcast[]>([])
  const [status, setStatus] = useState('Loading broadcasts…')
  useEffect(() => {
    let active = true
    let loading = false
    async function refresh() {
      if (loading) return
      loading = true
      try {
        const { supabase } = await import('../lib/supabase')
        const { data, error } = await supabase.from('official_broadcasts')
          .select('id,title,body,published_at').order('published_at', { ascending: false }).limit(30)
        if (error) throw error
        if (active) {
          setItems(data)
          setStatus(data.length ? '' : 'No broadcasts yet.')
        }
      } catch {
        if (active) setStatus('Could not refresh resident news.')
      } finally {
        loading = false
      }
    }
    void refresh()
    const timer = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [])
  return <section className="space-y-3"><h2 className="text-lg font-bold">Resident news</h2>
    {status && <p role="status" className="text-sm text-ink-3">{status}</p>}
    {items.map(item => <article key={item.id} className="break-words rounded-2xl bg-surface p-4 ring-1 ring-line">
      <h3 className="font-semibold">{item.title}</h3>
      <time className="text-xs text-ink-3" dateTime={item.published_at}>{new Date(item.published_at).toLocaleString()}</time>
      <p className="mt-2 whitespace-pre-wrap text-sm">{item.body}</p>
    </article>)}
  </section>
}
