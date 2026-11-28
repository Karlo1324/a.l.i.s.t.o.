import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) throw new Error('Missing Supabase environment variables')
// Reuse the resident auth client across localhost hot updates.
const previous = import.meta.hot?.data
export const supabase: import('@supabase/supabase-js').SupabaseClient =
  previous?.url === url && previous?.key === key && previous.client
    ? previous.client
    : createClient(url, key)
if (import.meta.hot) Object.assign(import.meta.hot.data, { client: supabase, url, key })
