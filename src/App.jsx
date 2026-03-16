import React from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/Sidebar'
import { Toaster } from '@/components/ui/toast'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Employees from '@/pages/Employees'
import Attendance from '@/pages/Attendance'
import OvertimeReport from '@/pages/OvertimeReport'
import LeaveManagement from '@/pages/LeaveManagement'
import MyProfile from '@/pages/MyProfile'

function AuthLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Dark sidebar */}
      <aside className="hidden md:flex h-full w-64 shrink-0">
        <Sidebar />
      </aside>
      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-500 border-t-transparent"></div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function RoleGuard({ roles, children }) {
  const { user } = useAuth()
  if (!roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route element={<AuthLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/employees"
          element={
            <RoleGuard roles={['admin', 'hr', 'manager']}>
              <Employees />
            </RoleGuard>
          }
        />
        <Route path="/attendance" element={<Attendance />} />
        <Route
          path="/overtime"
          element={
            <RoleGuard roles={['admin', 'hr', 'manager']}>
              <OvertimeReport />
            </RoleGuard>
          }
        />
        <Route path="/leaves" element={<LeaveManagement />} />
        <Route path="/profile" element={<MyProfile />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster />
    </AuthProvider>
  )
}
