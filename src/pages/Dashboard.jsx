import React, { useEffect, useState } from 'react'
import axios from 'axios'
import dayjs from 'dayjs'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { Users, UserCheck, Clock, DollarSign, TrendingUp, CalendarDays, ArrowUpRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const STAT_CARDS = [
  {
    key: 'totalEmployees',
    title: 'Total Employees',
    icon: Users,
    gradient: 'gradient-primary',
    shadow: 'shadow-indigo-500/20',
    format: (v) => v,
    sub: 'Active workforce',
  },
  {
    key: 'presentToday',
    title: 'Present Today',
    icon: UserCheck,
    gradient: 'gradient-success',
    shadow: 'shadow-emerald-500/20',
    format: (v) => v,
    subKey: 'totalEmployees',
    subFn: (v, s) => `of ${s.totalEmployees} employees`,
  },
  {
    key: 'overtimeHoursMonth',
    title: 'Overtime Hours',
    icon: Clock,
    gradient: 'gradient-warning',
    shadow: 'shadow-amber-500/20',
    format: (v) => `${v}h`,
    sub: 'This month',
  },
  {
    key: 'payrollEstimate',
    title: 'Payroll Estimate',
    icon: DollarSign,
    gradient: 'gradient-pink',
    shadow: 'shadow-pink-500/20',
    format: (v) => `$${v.toLocaleString()}`,
    sub: 'This month',
  },
]

const statusStyle = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}

const BAR_COLORS = ['#818cf8','#a78bfa','#818cf8','#a78bfa','#818cf8','#a78bfa','#6366f1']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl border border-indigo-100 bg-white px-3 py-2 shadow-lg">
        <p className="text-xs font-semibold text-gray-700">{label}</p>
        <p className="text-sm font-bold text-indigo-600">{payload[0].value} present</p>
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalEmployees: 0, presentToday: 0, overtimeHoursMonth: 0, payrollEstimate: 0,
  })
  const [weeklyData, setWeeklyData]   = useState([])
  const [recentLeaves, setRecentLeaves] = useState([])
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const isManager = ['admin', 'hr', 'manager'].includes(user?.role)
        const fromDate = dayjs().startOf('month').format('YYYY-MM-DD')
        const toDate   = dayjs().format('YYYY-MM-DD')

        const [empRes, todayRes, overtimeRes, leavesRes] = await Promise.all([
          axios.get('/api/employees').catch(() => ({ data: { employees: [] } })),
          isManager
            ? axios.get('/api/attendance/today').catch(() => ({ data: { data: [] } }))
            : Promise.resolve({ data: { data: [] } }),
          axios.get(`/api/overtime/report?from=${fromDate}&to=${toDate}`).catch(() => ({ data: { report: [] } })),
          isManager
            ? axios.get('/api/leaves/all?status=pending').catch(() => ({ data: { leaves: [] } }))
            : axios.get('/api/leaves/my').catch(() => ({ data: { leaves: [] } })),
        ])

        const employees   = empRes.data.employees || []
        const todayData   = todayRes.data.data || []
        const report      = overtimeRes.data.report || []
        const leaves      = leavesRes.data.leaves || []
        const presentToday = todayData.filter((d) => d.status !== 'absent').length

        setStats({
          totalEmployees:     employees.length,
          presentToday,
          overtimeHoursMonth: parseFloat((report.reduce((s, r) => s + (r.overtimeHours || 0), 0)).toFixed(1)),
          payrollEstimate:    parseFloat((report.reduce((s, r) => s + (r.totalPay || 0), 0)).toFixed(2)),
        })
        setRecentLeaves(leaves.slice(0, 5))

        const weekDays = []
        for (let i = 6; i >= 0; i--) {
          const day = dayjs().subtract(i, 'day')
          weekDays.push({ day: day.format('ddd'), date: day.format('YYYY-MM-DD'), count: 0 })
        }
        const todayIdx = weekDays.findIndex((d) => d.date === dayjs().format('YYYY-MM-DD'))
        if (todayIdx !== -1) weekDays[todayIdx].count = presentToday
        setWeeklyData(weekDays)
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [user])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good {dayjs().hour() < 12 ? 'morning' : dayjs().hour() < 18 ? 'afternoon' : 'evening'},{' '}
            <span className="text-indigo-600">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {dayjs().format('dddd, MMMM D, YYYY')}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-indigo-700">Live</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map(({ key, title, icon: Icon, gradient, shadow, format, sub, subFn }) => (
          <div key={key}
            className={cn('group relative overflow-hidden rounded-2xl p-5 text-white shadow-lg card-hover', gradient, shadow)}>
            {/* Decorative circle */}
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
            <div className="absolute -right-1 -top-1 h-12 w-12 rounded-full bg-white/10" />

            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-white/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <p className="mt-3 text-3xl font-bold text-white">{format(stats[key])}</p>
              <p className="mt-1 text-sm font-medium text-white/80">{title}</p>
              <p className="mt-0.5 text-xs text-white/60">
                {subFn ? subFn(stats[key], stats) : sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Attendance bar chart — wider */}
        <div className="lg:col-span-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                Weekly Attendance
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Present employees — last 7 days</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', radius: 8 }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {weeklyData.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent leaves — narrower */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              {['admin', 'hr', 'manager'].includes(user?.role) ? 'Pending Requests' : 'My Leaves'}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Latest leave applications</p>
          </div>

          {recentLeaves.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <CalendarDays className="h-5 w-5 text-gray-400" />
              </div>
              <p className="mt-3 text-sm text-gray-400">No leave records</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLeaves.map((leave) => (
                <div key={leave._id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-800">
                      {leave.employeeId?.name || 'Employee'}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{leave.type} · {leave.totalDays || 0}d</p>
                  </div>
                  <span className={cn('ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize', statusStyle[leave.status])}>
                    {leave.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
