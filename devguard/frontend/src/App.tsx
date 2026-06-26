import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ChatPage from './pages/ChatPage'
import ConsentPage from './pages/ConsentPage'
import HRDashboard from './pages/HRDashboard'
import HREmployeeDetail from './pages/HREmployeeDetail'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireHR({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== 'hr') return <Navigate to="/chat" replace />
  return <>{children}</>
}

function RequireEmployee({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role === 'hr') return <Navigate to="/hr" replace />
  return <>{children}</>
}

export default function App() {
  const { isAuthenticated, user } = useAuthStore()

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated
              ? user?.role === 'hr'
                ? <Navigate to="/hr" replace />
                : <Navigate to="/chat" replace />
              : <Navigate to="/login" replace />
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/consent"
          element={
            <RequireAuth>
              <ConsentPage />
            </RequireAuth>
          }
        />
        <Route
          path="/chat"
          element={
            <RequireEmployee>
              <ChatPage />
            </RequireEmployee>
          }
        />
        <Route
          path="/hr"
          element={
            <RequireHR>
              <HRDashboard />
            </RequireHR>
          }
        />
        <Route
          path="/hr/employees/:id"
          element={
            <RequireHR>
              <HREmployeeDetail />
            </RequireHR>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}