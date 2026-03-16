import React, { useEffect, useState } from 'react'
import axios from 'axios'
import dayjs from 'dayjs'
import { LogIn, LogOut, Loader2, Calendar, List, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/toast'

const statusColors = {
  present: 'bg-green-100 text-green-800 border-green-200',
  absent: 'bg-red-100 text-red-800 border-red-200',
  late: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'half-day': 'bg-blue-100 text-blue-800 border-blue-200',
}

const statusBadge = {
  present: 'success',
  absent: 'destructive',
  late: 'warning',
  'half-day': 'info',
}

export default function Attendance() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('mark')
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [todayRecord, setTodayRecord] = useState(null)
  const [marking, setMarking] = useState(false)
  // Monthly view
  const [monthYear, setMonthYear] = useState({ month: dayjs().month() + 1, year: dayjs().year() })
  const [monthlyRecords, setMonthlyRecords] = useState([])
  const [loadingMonthly, setLoadingMonthly] = useState(false)
  // Records tab
  const [from, setFrom] = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'))
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'))
  const [records, setRecords] = useState([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  // Today overview
  const [todayData, setTodayData] = useState([])

  const canManageAll = ['admin', 'hr', 'manager'].includes(user?.role)

  useEffect(() => {
    if (canManageAll) {
      fetchEmployees()
      fetchTodayOverview()
    } else {
      // Employee sees their own
      fetchTodayRecord()
    }
  }, [user])

  useEffect(() => {
    if (selectedEmployee) {
      fetchTodayRecordForEmployee(selectedEmployee)
    }
  }, [selectedEmployee])

  const fetchEmployees = async () => {
    try {
      const res = await axios.get('/api/employees')
      const active = (res.data.employees || []).filter((e) => e.status === 'active')
      setEmployees(active)
      if (active.length > 0) setSelectedEmployee(active[0]._id)
    } catch {}
  }

  const fetchTodayRecord = async () => {
    if (!user?.employeeRef) return
    try {
      const res = await axios.get(`/api/attendance/employee/${user.employeeRef}?from=${dayjs().format('YYYY-MM-DD')}&to=${dayjs().format('YYYY-MM-DD')}`)
      const records = res.data.attendance || []
      setTodayRecord(records[0] || null)
    } catch {}
  }

  const fetchTodayRecordForEmployee = async (empId) => {
    try {
      const res = await axios.get(`/api/attendance/employee/${empId}?from=${dayjs().format('YYYY-MM-DD')}&to=${dayjs().format('YYYY-MM-DD')}`)
      const records = res.data.attendance || []
      setTodayRecord(records[0] || null)
    } catch {}
  }

  const fetchTodayOverview = async () => {
    try {
      const res = await axios.get('/api/attendance/today')
      setTodayData(res.data.data || [])
    } catch {}
  }

  const handleMark = async () => {
    setMarking(true)
    try {
      const body = {}
      if (canManageAll && selectedEmployee) body.employeeId = selectedEmployee
      await axios.post('/api/attendance/mark', body)
      toast({ title: 'Success', description: todayRecord ? 'Checked out successfully' : 'Checked in successfully' })
      if (canManageAll && selectedEmployee) {
        fetchTodayRecordForEmployee(selectedEmployee)
        fetchTodayOverview()
      } else {
        fetchTodayRecord()
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err.response?.data?.message || 'Failed to mark attendance' })
    } finally {
      setMarking(false)
    }
  }

  const fetchMonthlyRecords = async () => {
    const empId = canManageAll ? selectedEmployee : user?.employeeRef
    if (!empId) return
    setLoadingMonthly(true)
    try {
      const from = dayjs(`${monthYear.year}-${monthYear.month}-01`).format('YYYY-MM-DD')
      const to = dayjs(`${monthYear.year}-${monthYear.month}-01`).endOf('month').format('YYYY-MM-DD')
      const res = await axios.get(`/api/attendance/employee/${empId}?from=${from}&to=${to}`)
      setMonthlyRecords(res.data.attendance || [])
    } catch {} finally {
      setLoadingMonthly(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'monthly') fetchMonthlyRecords()
  }, [activeTab, monthYear, selectedEmployee])

  const fetchRecords = async () => {
    const empId = canManageAll ? selectedEmployee : user?.employeeRef
    if (!empId) return
    setLoadingRecords(true)
    try {
      const res = await axios.get(`/api/attendance/employee/${empId}?from=${from}&to=${to}`)
      setRecords(res.data.attendance || [])
    } catch {} finally {
      setLoadingRecords(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'records') fetchRecords()
  }, [activeTab, selectedEmployee])

  // Build calendar grid
  const buildCalendarDays = () => {
    const firstDay = dayjs(`${monthYear.year}-${String(monthYear.month).padStart(2, '0')}-01`)
    const daysInMonth = firstDay.daysInMonth()
    const startDow = firstDay.day() // 0=Sun
    const days = []
    // Empty cells before first day
    for (let i = 0; i < startDow; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = firstDay.date(d).format('YYYY-MM-DD')
      const record = monthlyRecords.find((r) => dayjs(r.date).format('YYYY-MM-DD') === dateStr)
      const dow = firstDay.date(d).day()
      days.push({ day: d, date: dateStr, record, isWeekend: dow === 0 || dow === 6 })
    }
    return days
  }

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-sm text-muted-foreground">Track and manage employee attendance</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {[
          { key: 'mark', label: 'Mark Attendance', icon: Clock },
          { key: 'monthly', label: 'Monthly View', icon: Calendar },
          { key: 'records', label: 'Records', icon: List },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === key ? 'bg-white shadow text-gray-900' : 'text-muted-foreground hover:text-gray-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Mark Attendance */}
      {activeTab === 'mark' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Mark Attendance</CardTitle>
              <CardDescription>Check in or check out for today</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canManageAll && (
                <div className="space-y-2">
                  <Label>Select Employee</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp._id} value={emp._id}>
                          {emp.name} — {emp.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">Today: {dayjs().format('dddd, MMMM D, YYYY')}</p>
                {todayRecord ? (
                  <div className="space-y-1">
                    <p className="text-sm">Check-in: <span className="font-medium text-green-700">{dayjs(todayRecord.checkIn).format('h:mm A')}</span></p>
                    {todayRecord.checkOut ? (
                      <p className="text-sm">Check-out: <span className="font-medium text-blue-700">{dayjs(todayRecord.checkOut).format('h:mm A')}</span></p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not checked out yet</p>
                    )}
                    {todayRecord.hoursWorked > 0 && (
                      <p className="text-sm">Hours worked: <span className="font-medium">{todayRecord.hoursWorked.toFixed(2)}h</span></p>
                    )}
                    {todayRecord.overtimeHours > 0 && (
                      <p className="text-sm">Overtime: <span className="font-medium text-orange-600">{todayRecord.overtimeHours.toFixed(2)}h</span></p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not checked in yet</p>
                )}
              </div>

              <Button
                className="w-full"
                onClick={handleMark}
                disabled={marking || (todayRecord?.checkIn && todayRecord?.checkOut)}
                variant={todayRecord?.checkIn && !todayRecord?.checkOut ? 'destructive' : 'default'}
              >
                {marking ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                ) : todayRecord?.checkIn && todayRecord?.checkOut ? (
                  'Completed for Today'
                ) : todayRecord?.checkIn ? (
                  <><LogOut className="mr-2 h-4 w-4" />Check Out</>
                ) : (
                  <><LogIn className="mr-2 h-4 w-4" />Check In</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Today's Overview for managers */}
          {canManageAll && (
            <Card>
              <CardHeader>
                <CardTitle>Today's Overview</CardTitle>
                <CardDescription>
                  {todayData.filter((d) => d.status !== 'absent').length} present, {todayData.filter((d) => d.status === 'absent').length} absent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todayData.map((item) => (
                        <TableRow key={item.employee._id}>
                          <TableCell className="font-medium">{item.employee.name}</TableCell>
                          <TableCell className="text-sm">
                            {item.attendance?.checkIn ? dayjs(item.attendance.checkIn).format('h:mm A') : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadge[item.status] || 'outline'} className="capitalize">
                              {item.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Monthly View */}
      {activeTab === 'monthly' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Monthly Calendar</CardTitle>
                <CardDescription>Attendance calendar view</CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                {canManageAll && (
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp._id} value={emp._id}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select value={String(monthYear.month)} onValueChange={(v) => setMonthYear((p) => ({ ...p, month: parseInt(v) }))}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(monthYear.year)} onValueChange={(v) => setMonthYear((p) => ({ ...p, year: parseInt(v) }))}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2022, 2023, 2024, 2025, 2026].map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingMonthly ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Legend */}
                <div className="mb-4 flex flex-wrap gap-3 text-xs">
                  {Object.entries(statusColors).map(([status, cls]) => (
                    <div key={status} className="flex items-center gap-1">
                      <div className={`h-3 w-3 rounded border ${cls}`}></div>
                      <span className="capitalize">{status}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded border bg-gray-100"></div>
                    <span>Weekend/No data</span>
                  </div>
                </div>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                  ))}
                </div>
                {/* Calendar cells */}
                <div className="grid grid-cols-7 gap-1">
                  {buildCalendarDays().map((cell, idx) => {
                    if (!cell) return <div key={`empty-${idx}`} />
                    const status = cell.record?.status
                    const cls = cell.isWeekend ? 'bg-gray-50 text-gray-400' : status ? statusColors[status] : 'bg-gray-50 text-gray-400'
                    return (
                      <div key={cell.date} className={`rounded border p-1 text-center ${cls}`} title={status || (cell.isWeekend ? 'Weekend' : 'No data')}>
                        <span className="text-xs font-medium">{cell.day}</span>
                        {cell.record?.hoursWorked > 0 && (
                          <p className="text-xs leading-tight">{cell.record.hoursWorked.toFixed(1)}h</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Records */}
      {activeTab === 'records' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle>Attendance Records</CardTitle>
                <CardDescription>Detailed attendance history</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2 items-end">
                {canManageAll && (
                  <div className="space-y-1">
                    <Label className="text-xs">Employee</Label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp._id} value={emp._id}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">From</Label>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To</Label>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
                </div>
                <Button onClick={fetchRecords} disabled={loadingRecords}>
                  {loadingRecords ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingRecords ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : records.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">No records found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Hours Worked</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell>{dayjs(r.date).format('MMM D, YYYY')}</TableCell>
                      <TableCell>{r.checkIn ? dayjs(r.checkIn).format('h:mm A') : '—'}</TableCell>
                      <TableCell>{r.checkOut ? dayjs(r.checkOut).format('h:mm A') : '—'}</TableCell>
                      <TableCell>{r.hoursWorked ? `${r.hoursWorked.toFixed(2)}h` : '—'}</TableCell>
                      <TableCell>
                        {r.overtimeHours > 0 ? (
                          <span className="text-orange-600 font-medium">{r.overtimeHours.toFixed(2)}h</span>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadge[r.status] || 'outline'} className="capitalize">
                          {r.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
