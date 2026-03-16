import React, { useEffect, useState } from 'react'
import axios from 'axios'
import dayjs from 'dayjs'
import { Loader2, Check, X, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/toast'

const leaveTypes = ['sick', 'casual', 'annual', 'unpaid', 'maternity', 'paternity']

const statusBadgeVariant = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
}

const ENTITLEMENTS = { annual: 12, sick: 10, casual: 7, unpaid: 365, maternity: 90, paternity: 14 }

export default function LeaveManagement() {
  const { user } = useAuth()
  const { toast } = useToast()
  const canManage = ['admin', 'hr', 'manager'].includes(user?.role)

  const [activeTab, setActiveTab] = useState('apply')
  const [myLeaves, setMyLeaves] = useState([])
  const [allLeaves, setAllLeaves] = useState([])
  const [balance, setBalance] = useState({})
  const [loadingMyLeaves, setLoadingMyLeaves] = useState(false)
  const [loadingAllLeaves, setLoadingAllLeaves] = useState(false)
  const [loadingBalance, setLoadingBalance] = useState(false)

  // Apply form
  const [form, setForm] = useState({ type: 'sick', fromDate: '', toDate: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)

  // Actions
  const [actionLoading, setActionLoading] = useState({})

  useEffect(() => {
    fetchMyLeaves()
    if (user?.employeeRef) fetchBalance(user.employeeRef)
    if (canManage) fetchAllLeaves()
  }, [user])

  const fetchMyLeaves = async () => {
    setLoadingMyLeaves(true)
    try {
      const res = await axios.get('/api/leaves/my')
      setMyLeaves(res.data.leaves || [])
    } catch {} finally {
      setLoadingMyLeaves(false)
    }
  }

  const fetchAllLeaves = async () => {
    setLoadingAllLeaves(true)
    try {
      const res = await axios.get('/api/leaves/all?status=pending')
      setAllLeaves(res.data.leaves || [])
    } catch {} finally {
      setLoadingAllLeaves(false)
    }
  }

  const fetchBalance = async (empId) => {
    setLoadingBalance(true)
    try {
      const res = await axios.get(`/api/leaves/balance/${empId}`)
      setBalance(res.data.balance || {})
    } catch {} finally {
      setLoadingBalance(false)
    }
  }

  const handleApply = async (e) => {
    e.preventDefault()
    if (!form.type || !form.fromDate || !form.toDate) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill all required fields' })
      return
    }
    if (dayjs(form.toDate).isBefore(dayjs(form.fromDate))) {
      toast({ variant: 'destructive', title: 'Invalid Dates', description: 'End date must be after start date' })
      return
    }
    setSubmitting(true)
    try {
      await axios.post('/api/leaves/apply', form)
      toast({ title: 'Success', description: 'Leave application submitted' })
      setForm({ type: 'sick', fromDate: '', toDate: '', reason: '' })
      fetchMyLeaves()
      if (user?.employeeRef) fetchBalance(user.employeeRef)
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err.response?.data?.message || 'Failed to apply' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleAction = async (leaveId, action) => {
    setActionLoading((prev) => ({ ...prev, [leaveId]: action }))
    try {
      await axios.put(`/api/leaves/${leaveId}/${action}`)
      toast({ title: 'Success', description: `Leave ${action}d successfully` })
      fetchAllLeaves()
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to ${action} leave` })
    } finally {
      setActionLoading((prev) => ({ ...prev, [leaveId]: null }))
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
        <p className="text-sm text-muted-foreground">Apply for and manage leave requests</p>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(ENTITLEMENTS).map(([type, entitled]) => {
          const bal = balance[type]
          const remaining = bal?.remaining ?? entitled
          const used = bal?.used ?? 0
          const pct = entitled > 0 ? ((used / entitled) * 100).toFixed(0) : 0
          return (
            <Card key={type} className="text-center">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground capitalize mb-1">{type}</p>
                <p className="text-2xl font-bold text-gray-900">{remaining}</p>
                <p className="text-xs text-muted-foreground">of {entitled} days</p>
                <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{used} used</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {[
          { key: 'apply', label: 'Apply for Leave' },
          { key: 'my', label: 'My Leaves' },
          ...(canManage ? [{ key: 'all', label: 'All Pending Leaves' }] : []),
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === key ? 'bg-white shadow text-gray-900' : 'text-muted-foreground hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Apply */}
      {activeTab === 'apply' && (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Apply for Leave
            </CardTitle>
            <CardDescription>Submit a new leave application</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleApply} className="space-y-4">
              <div className="space-y-2">
                <Label>Leave Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Date *</Label>
                  <Input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>To Date *</Label>
                  <Input type="date" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  placeholder="Reason for leave (optional)"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab: My Leaves */}
      {activeTab === 'my' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Leave History</CardTitle>
            <CardDescription>{myLeaves.length} leave records</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingMyLeaves ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : myLeaves.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">No leave records</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myLeaves.map((leave) => (
                    <TableRow key={leave._id}>
                      <TableCell className="capitalize font-medium">{leave.type}</TableCell>
                      <TableCell>{dayjs(leave.fromDate).format('MMM D, YYYY')}</TableCell>
                      <TableCell>{dayjs(leave.toDate).format('MMM D, YYYY')}</TableCell>
                      <TableCell>{leave.totalDays}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">{leave.reason || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant[leave.status] || 'outline'} className="capitalize">
                          {leave.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {dayjs(leave.appliedAt).format('MMM D, YYYY')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: All Pending Leaves */}
      {activeTab === 'all' && canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Leave Requests</CardTitle>
            <CardDescription>{allLeaves.length} pending approvals</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingAllLeaves ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : allLeaves.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No pending leave requests
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Applied On</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allLeaves.map((leave) => (
                    <TableRow key={leave._id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{leave.employeeId?.name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{leave.employeeId?.department}</p>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{leave.type}</TableCell>
                      <TableCell>{dayjs(leave.fromDate).format('MMM D, YYYY')}</TableCell>
                      <TableCell>{dayjs(leave.toDate).format('MMM D, YYYY')}</TableCell>
                      <TableCell>{leave.totalDays}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-muted-foreground">{leave.reason || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dayjs(leave.appliedAt).format('MMM D')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 h-8"
                            onClick={() => handleAction(leave._id, 'approve')}
                            disabled={!!actionLoading[leave._id]}
                          >
                            {actionLoading[leave._id] === 'approve' ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <><Check className="mr-1 h-3 w-3" />Approve</>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8"
                            onClick={() => handleAction(leave._id, 'reject')}
                            disabled={!!actionLoading[leave._id]}
                          >
                            {actionLoading[leave._id] === 'reject' ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <><X className="mr-1 h-3 w-3" />Reject</>
                            )}
                          </Button>
                        </div>
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
