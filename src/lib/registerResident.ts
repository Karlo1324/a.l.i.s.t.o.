export async function registerResident(email: string, password: string, fullName: string, phone: string) {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Resident registration is unavailable until Supabase is connected.')

  const response = await fetch(new URL('/auth/v1/signup', url), {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, data: { full_name: fullName, phone: phone || null } }),
  })
  const result = await response.json()
  if (!response.ok) {
    if (response.status === 429) throw new Error('Too many attempts. Please try again later.')
    if (result.error_code === 'weak_password') throw new Error('Choose a stronger password and try again.')
    throw new Error('Registration could not be completed. Check your details or try again later.')
  }
  return result.access_token ? 'Registration complete.' : 'Check your email for a confirmation link.'
}
