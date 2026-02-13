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
import ResetPassword from './pages/ResetPassword'
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
import MyFeedback from './pages/MyFeedback'
import FAQ from './pages/FAQ'
import Blog from './pages/Blog'
import InvitedSignup from './pages/InvitedSignup'
import TagProfilePage from './pages/TagProfilePage'
import FamilyTree from './pages/FamilyTree'
import Layout from './components/Layout'
import InstallPrompt from './components/InstallPrompt'
// Admin pages
import AdminDashboard from './pages/AdminDashboard'
import AdminUsers from './pages/AdminUsers'
import AdminEvents from './pages/AdminEvents'
import AdminFeedback from './pages/AdminFeedback'
import AdminDesignPreview from './pages/AdminDesignPreview'
// Landing page variations (superuser only)
import LandingV1 from './pages/LandingV1'
import LandingV2 from './pages/LandingV2'
import LandingV3 from './pages/LandingV3'
import LandingV4 from './pages/LandingV4'
import LandingV5 from './pages/LandingV5'
import LandingV6 from './pages/LandingV6'
import LandingV7 from './pages/LandingV7'
import LandingV8 from './pages/LandingV8'
import LandingV9 from './pages/LandingV9'

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

// Guard for superuser-only routes
function SuperuserRoute({ children }) {
  const { user, isSuperuser, loading } = useAuth()
  if (loading) return null
  if (!user || !isSuperuser) return <Navigate to="/feed" replace />
  return children
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
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />
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
              <Route path="/my-feedback" element={<MyFeedback />} />
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
              <Route path="/blog" element={<Blog />} />
              <Route path="/faq" element={<FAQ />} />
              {/* Admin routes - superuser only */}
              <Route path="/admin" element={<SuperuserRoute><AdminDashboard /></SuperuserRoute>} />
              <Route path="/admin/users" element={<SuperuserRoute><AdminUsers /></SuperuserRoute>} />
              <Route path="/admin/events" element={<SuperuserRoute><AdminEvents /></SuperuserRoute>} />
              <Route path="/admin/feedback" element={<SuperuserRoute><AdminFeedback /></SuperuserRoute>} />
              <Route path="/admin/design" element={<SuperuserRoute><AdminDesignPreview /></SuperuserRoute>} />
              {/* Landing page variations - superuser only */}
              <Route path="/admin/landing-1" element={<SuperuserRoute><LandingV1 /></SuperuserRoute>} />
              <Route path="/admin/landing-2" element={<SuperuserRoute><LandingV2 /></SuperuserRoute>} />
              <Route path="/admin/landing-3" element={<SuperuserRoute><LandingV3 /></SuperuserRoute>} />
              <Route path="/admin/landing-4" element={<SuperuserRoute><LandingV4 /></SuperuserRoute>} />
              <Route path="/admin/landing-5" element={<SuperuserRoute><LandingV5 /></SuperuserRoute>} />
              <Route path="/admin/landing-6" element={<SuperuserRoute><LandingV6 /></SuperuserRoute>} />
              <Route path="/admin/landing-7" element={<SuperuserRoute><LandingV7 /></SuperuserRoute>} />
              <Route path="/admin/landing-8" element={<SuperuserRoute><LandingV8 /></SuperuserRoute>} />
              <Route path="/admin/landing-9" element={<SuperuserRoute><LandingV9 /></SuperuserRoute>} />
            </Route>
          </Routes>
          <InstallPrompt />
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App