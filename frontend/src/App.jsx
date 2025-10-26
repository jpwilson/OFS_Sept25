import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import { ConfirmProvider } from './components/ConfirmModal'
import Feed from './pages/Feed'
import EventDetail from './pages/EventDetail'
import Profile from './pages/Profile'
import CreateEvent from './pages/CreateEvent'
import EditEvent from './pages/EditEvent'
import Login from './pages/Login'
import Map from './pages/Map'
import Timeline from './pages/Timeline'
import Layout from './components/Layout'

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Feed />} />
              <Route path="/event/:id" element={<EventDetail />} />
              <Route path="/event/:id/edit" element={<EditEvent />} />
              <Route path="/profile/:username" element={<Profile />} />
              <Route path="/create" element={<CreateEvent />} />
              <Route path="/map" element={<Map />} />
              <Route path="/timeline" element={<Timeline />} />
            </Route>
          </Routes>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App