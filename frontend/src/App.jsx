import { Routes, Route, Navigate } from 'react-router-dom'
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
import Map from './pages/Map'
import Timeline from './pages/Timeline'
import Checkout from './pages/Checkout'
import PricingPage from './pages/PricingPage'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Contact from './pages/Contact'
import AuthCallback from './pages/AuthCallback'
import Groups from './pages/Groups'
import SharedEvent from './pages/SharedEvent'
import Billing from './pages/Billing'
import NotificationSettings from './pages/NotificationSettings'
import Layout from './components/Layout'

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
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/share/:token" element={<SharedEvent />} />
            <Route element={<Layout />}>
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/event/:id" element={<EventDetail />} />
              <Route path="/event/:id/edit" element={<EditEvent />} />
              <Route path="/profile/:username" element={<Profile />} />
              <Route path="/profile/:username/edit" element={<EditProfile />} />
              <Route path="/settings/notifications" element={<NotificationSettings />} />
              <Route path="/create" element={<CreateEvent />} />
              <Route path="/map" element={<Map />} />
              <Route path="/timeline" element={<Timeline />} />
              <Route path="/groups" element={<Groups />} />
            </Route>
          </Routes>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App