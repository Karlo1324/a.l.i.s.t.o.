import { useId, useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { TextInput } from './ui'

export function PasswordField({ creating = false }: { creating?: boolean }) {
  const passwordId = useId()
  const [showPassword, setShowPassword] = useState(false)
  return (
    <div>
      <label htmlFor={passwordId} className="mb-1.5 block text-[13px] font-semibold text-ink-2">Password</label>
      <TextInput id={passwordId} icon={Lock} type={showPassword ? 'text' : 'password'}
        placeholder="Password"
        name="password" required={creating} minLength={creating ? 8 : undefined}
        autoComplete={creating ? 'new-password' : 'current-password'} autoCapitalize="none" spellCheck={false}
        right={
          <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="-mr-2 grid size-11 place-items-center rounded-lg text-ink-2"
            onClick={() => setShowPassword(visible => !visible)}>
            {showPassword ? <Eye size={19} aria-hidden /> : <EyeOff size={19} aria-hidden />}
          </button>
        }
      />
    </div>
  )
}
