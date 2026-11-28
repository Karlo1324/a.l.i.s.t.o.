import { Button, LogoMark } from '../components/ui'
import { useNav } from './common'

export function Onboarding() {
  const nav = useNav()
  return <div className="absolute inset-0 flex flex-col justify-center bg-navy px-6 pb-12 text-white">
    <LogoMark size={72} variant="dark" />
    <h1 className="mt-8 text-4xl font-bold">Your community, alert and ready.</h1>
    <p className="mt-5 text-lg text-white/75">Record incidents, select their location, and track their progress.</p>
    <p className="mt-6 text-sm text-white/60">This local workspace starts empty. Reports are not sent to officials and clear when you refresh.</p>
    <Button size="lg" className="mt-10 w-full" onClick={() => nav.setStage('login')}>Sign in</Button>
    <button className="mt-4 py-2 font-semibold" onClick={() => nav.setStage('register')}>Create an account</button>
  </div>
}
