// /demo-login (owner: AUTH). The investor demo, reached by address only (AUTH.md decision 5:
// it leaves the public sign-up page). Uses AuthContext's demoLogin, unchanged.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext.jsx'
import { Button } from '../../ui/Button.jsx'
import { Field } from '../../ui/Field.jsx'
import { AuthStage } from '../stage/AuthStage.jsx'
import { SCENES } from '../stage/scenes.js'
import { PasswordBox, Stack, TextLink } from '../stage/parts.jsx'
import s from './LoginPage.module.css'

export default function DemoPage() {
  const auth = useAuth() || {}
  const navigate = useNavigate()
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const submit = async (e) => {
    e.preventDefault()
    if (!pw) return setError('Enter the demo password.')
    setBusy(true)
    setError(null)
    const r = await auth.demoLogin(pw)
    setBusy(false)
    if (r?.success) navigate('/feed')
    else setError("That password doesn't open the demo.")
  }
  return (
    <AuthStage scene={SCENES.demo} sceneKey="demo" title="Investor demo" head={{ before: 'The investor', mark: 'demo', after: '.' }} sub="A full family account to look around in, with real stories and nothing to set up.">
      <form onSubmit={submit} noValidate className={s.form}>
        <Stack>
          <Field label="Demo password" error={error || undefined}>
            <PasswordBox autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} data-ui="password" />
          </Field>
          <Button type="submit" size="lg" full busy={busy} data-ui="submit">
            Open the demo
          </Button>
          <p className={s.center}>
            <TextLink to="/login?signup=true">Start your own family's account</TextLink>
          </p>
        </Stack>
      </form>
    </AuthStage>
  )
}
