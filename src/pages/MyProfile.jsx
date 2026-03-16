import React, { useEffect, useState } from 'react'
import axios from 'axios'
import dayjs from 'dayjs'
import { Loader2, User, Building2, Calendar, Phone, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/context/AuthContext'

const ENTITLEMENTS = { annual: 12, sick: 10, casual: 7, unpaid: 365, maternity: 90, paternity: 14 }

const statusBadge = {
  present: 'success',
  absent: 'destructive',
  late: 'warning',
  'half-day': 'info',
}

const roleBadgeVariant = {
  admin: 'destructive',
  hr: 'default',
  manager: 'secondary',
  employee: 'outline',
}

export default function MyProfile() {
  const { user } = useAuth()
  const [employee, setEmployee] = useState(null)
  const [summary, setSummary] = useState(null)
  const [recentAttendance, setRecentAttendance] = useState([])
  const [balance, setBalance] = useState({})
  const [loading, setLoading] = useState(true)

  const empId = user?.employeeRef?._id || user?.employeeRef

  useEffect(() => {
    if (empId) {
      fetchAll()
    } else {
      setLoading(false)
    }
  }, [user, empId])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [empRes, summaryRes, attendanceRes, balanceRes] = await Promise.all([
        axios.get(`/api/employees/${empId}`).catch(() => ({ data: { employee: null } })),
        axios.get(`/api/attendance/summary/${empId}`).catch(() => ({ data: { summary: null } })),
        axios.get(`/api/attendance/employee/${empId}?from=${dayjs().subtract(30, 'day').format('YYYY-MM-DD')}&to=${dayjs().format('YYYY-MM-DD')}`).catch(() => ({ data: { attendance: [] } })),
        axios.get(`/api/leaves/balance/${empId}`).catch(() => ({ data: { balance: {} } })),
      ])
      setEmployee(empRes.data.employee)
      setSummary(summaryRes.data.summary)
      setRecentAttendance(attendanceRes.data.attendance || [])
      setBalance(balanceRes.data.balance || {})
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-muted-foreground">Your personal information and statistics</p>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <Avatar className="h-20 w-20 text-2xl">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
                <Badge variant={roleBadgeVariant[user?.role] || 'outline'} className="capitalize">
                  {user?.role}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {employee && (
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {employee.department && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {employee.department}
                    </span>
                  )}
                  {employee.designation && (
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {employee.designation}
                    </span>
                  )}
                  {employee.joiningDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Joined {dayjs(employee.joiningDate).format('MMM D, YYYY')}
                    </span>
                  )}
                  {employee.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {employee.phone}
                    </span>
                  )}
                </div>
              )}
            </div>
            {employee && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Employee ID</p>
                <p className="font-mono font-semibold text-gray-900">{employee.employeeId}</p>
                <Badge variant={employee.status === 'active' ? 'success' : 'secondary'} className="mt-1 capitalize">
                  {employee.status}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Days Present</p>
              <p className="text-3xl font-bold mt-1">{summary.totalPresent}</p>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Total Hours</p>
              <p className="text-3xl font-bold mt-1">{summary.totalHoursWorked}h</p>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Overtime Hours</p>
              <p className="text-3xl font-bold mt-1 text-orange-600">{summary.totalOvertimeHours}h</p>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Avg Hours/Day</p>
              <p className="text-3xl font-bold mt-1">{summary.avgHoursPerDay}h</p>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Leave Balance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leave Balance</CardTitle>
            <CardDescription>Remaining leave days for this year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(ENTITLEMENTS).map(([type, entitled]) => {
                const bal = balance[type]
                const used = bal?.used ?? 0
                const remaining = bal?.remaining ?? entitled
                const pct = entitled > 0 ? (used / entitled) * 100 : 0
                return (
                  <div key={type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize font-medium">{type}</span>
                      <span className="text-muted-foreground">{remaining}/{entitled} days</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Attendance</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentAttendance.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
                No attendance records
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>In</TableHead>
                      <TableHead>Out</TableHead>
                      <TableHead>Hrs</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentAttendance.map((r) => (
                      <TableRow key={r._id}>
                        <TableCell className="text-sm">{dayjs(r.date).format('MMM D')}</TableCell>
                        <TableCell className="text-sm">
                          {r.checkIn ? dayjs(r.checkIn).format('h:mm A') : '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.checkOut ? dayjs(r.checkOut).format('h:mm A') : '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.hoursWorked ? `${r.hoursWorked.toFixed(1)}h` : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadge[r.status] || 'outline'} className="capitalize text-xs">
                            {r.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
