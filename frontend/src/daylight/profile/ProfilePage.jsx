// Profile, /profile/:username (stub by F0; FEED owns this file).
import { useParams } from 'react-router-dom'
import { Head } from '../ui/Head.jsx'
import { Stub } from '../ui/Stub.jsx'

export default function ProfilePage() {
  const { username } = useParams()
  return (
    <div className="a-wrap" style={{ paddingBlock: 20, display: 'grid', gap: 16 }} data-wash="zest">
      <Head as="h1" before={`@${username}`} />
      <Stub pkg="feed" name="Profile" note="Stub. The You band, readouts, follow states and Stories / Drafts / Trash arrive with FEED." />
    </div>
  )
}
