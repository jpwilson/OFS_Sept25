import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import { ConfirmProvider } from './components/ConfirmModal'
import Landing from './pages/Landing'
import Feed from './pages/Feed'
import EventDetail from './pages/EventDetail'
import Profile from './pages/Profile'
import EditProfile from './pages/EditProfile'
import CreateEvent from './pages/CreateEvent'
import EditEvent from './pages/EditEvent'
import Login from './pages/Login'
import Checkout from './pages/Checkout'
import PricingPage from './pages/PricingPage'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Contact from './pages/Contact'
import AuthCallback from './pages/AuthCallback'
import Groups from './pages/Groups'
// SharedEvent removed - now using EventDetail with isShareMode
import InviteLanding from './pages/InviteLanding'
import Billing from './pages/Billing'
import NotificationSettings from './pages/NotificationSettings'
import Notifications from './pages/Notifications'
import Preferences from './pages/Preferences'
import Relationships from './pages/Relationships'
import Tags from './pages/Tags'
import FAQ from './pages/FAQ'
import InvitedSignup from './pages/InvitedSignup'
import TagProfilePage from './pages/TagProfilePage'
import FamilyTree from './pages/FamilyTree'
import Layout from './components/Layout'

// Redirect from old /signup?invite=TOKEN format to new /join/TOKEN format
function SignupInviteRedirect() {
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite')

  if (inviteToken) {
    return <Navigate to={`/join/${inviteToken}`} replace />
  }
  // No invite token, redirect to login with signup tab
  return <Navigate to="/login?signup=true" replace />
}

// Component to handle root route redirect
function RootRedirect() {
  const { user } = useAuth()
  return user ? <Navigate to="/feed" replace /> : <Landing />
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignupInviteRedirect />} />
            <Route path="/signup/invited" element={<InvitedSignup />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/share/:token" element={<EventDetail isShareMode={true} />} />
            <Route path="/join/:token" element={<InviteLanding />} />
            <Route element={<Layout />}>
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/event/:id" element={<EventDetail />} />
              <Route path="/event/:id/edit" element={<EditEvent />} />
              <Route path="/profile/:username" element={<Profile />} />
              <Route path="/profile/:username/edit" element={<EditProfile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Preferences />} />
              <Route path="/relationships" element={<Relationships />} />
              <Route path="/tags" element={<Tags />} />
              {/* Backwards compatibility redirects */}
              <Route path="/settings/notifications" element={<Navigate to="/notifications" replace />} />
              <Route path="/preferences" element={<Navigate to="/settings" replace />} />
              <Route path="/tag-profile/:profileId" element={<TagProfilePage />} />
              <Route path="/family-tree" element={<FamilyTree />} />
              <Route path="/create" element={<CreateEvent />} />
              {/* Legacy routes - redirect to unified explorer with view param */}
              <Route path="/map" element={<Navigate to="/feed?view=map" replace />} />
              <Route path="/timeline" element={<Navigate to="/feed?view=timeline" replace />} />
              <Route path="/groups" element={<Groups />} />
            </Route>
          </Routes>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App