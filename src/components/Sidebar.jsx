import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Clock,
  FileText,
  TrendingUp,
  User,
  LogOut,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const allNavItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'hr', 'manager', 'employee'],
  },
  {
    label: 'Employees',
    path: '/employees',
    icon: Users,
    roles: ['admin', 'hr', 'manager'],
  },
  {
    label: 'Attendance',
    path: '/attendance',
    icon: Clock,
    roles: ['admin', 'hr', 'manager', 'employee'],
  },
  {
    label: 'Leave Management',
    path: '/leaves',
    icon: FileText,
    roles: ['admin', 'hr', 'manager', 'employee'],
  },
  {
    label: 'Overtime Report',
    path: '/overtime',
    icon: TrendingUp,
    roles: ['admin', 'hr', 'manager'],
  },
  {
    label: 'My Profile',
    path: '/profile',
    icon: User,
    roles: ['admin', 'hr', 'manager', 'employee'],
  },
]

const roleColors = {
  admin:    'bg-red-500/20 text-red-300',
  hr:       'bg-blue-500/20 text-blue-300',
  manager:  'bg-purple-500/20 text-purple-300',
  employee: 'bg-green-500/20 text-green-300',
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const navItems = allNavItems.filter(
    (item) => user && item.roles.includes(user.role)
  )

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="sidebar-bg flex h-full w-64 flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-lg shadow-indigo-500/30">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-base font-bold text-white tracking-tight">WorkForce</p>
          <p className="text-[10px] font-medium text-indigo-300 uppercase tracking-widest">Pro</p>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/10" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Navigation
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'gradient-primary text-white shadow-md shadow-indigo-500/30'
                  : 'text-slate-400 hover:bg-white/8 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110',
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                  )}
                />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/10" />

      {/* User footer */}
      <div className="p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/6 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full gradient-primary text-xs font-bold text-white shadow shadow-indigo-500/30">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
            <span className={cn('inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize mt-0.5', roleColors[user?.role] || 'bg-slate-500/20 text-slate-300')}>
              {user?.role}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
