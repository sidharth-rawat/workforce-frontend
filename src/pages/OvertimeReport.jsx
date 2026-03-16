import React, { useState, useEffect } from 'react'
import axios from 'axios'
import dayjs from 'dayjs'
import { Download, Loader2, TrendingUp, Filter } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'

export default function OvertimeReport() {
  const { toast } = useToast()
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'))
  const [department, setDepartment] = useState('all')
  const [departments, setDepartments] = useState([])
  const [report, setReport] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [generated, setGenerated] = useState(false)

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      const res = await axios.get('/api/employees/departments/list')
      setDepartments(res.data.departments || [])
    } catch {}
  }

  const buildQuery = () => {
    const params = new URLSearchParams()
    if (from) params.append('from', from)
    if (to) params.append('to', to)
    if (department && department !== 'all') params.append('department', department)
    return params.toString()
  }

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`/api/overtime/report?${buildQuery()}`)
      setReport(res.data.report || [])
      setGenerated(true)
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate report' })
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const res = await axios.get(`/api/overtime/export-csv?${buildQuery()}`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `overtime-report-${from}-to-${to}.csv`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Export failed' })
    } finally {
      setExporting(false)
    }
  }

  // Totals
  const totals = report.reduce(
    (acc, r) => ({
      totalHours: acc.totalHours + r.totalHours,
      regularHours: acc.regularHours + r.regularHours,
      overtimeHours: acc.overtimeHours + r.overtimeHours,
      regularPay: acc.regularPay + r.regularPay,
      overtimePay: acc.overtimePay + r.overtimePay,
      totalPay: acc.totalPay + r.totalPay,
    }),
    { totalHours: 0, regularHours: 0, overtimeHours: 0, regularPay: 0, overtimePay: 0, totalPay: 0 }
  )

  // Top 10 by overtime hours for chart
  const chartData = [...report]
    .sort((a, b) => b.overtimeHours - a.overtimeHours)
    .slice(0, 10)
    .map((r) => ({ name: r.name.split(' ')[0], overtime: r.overtimeHours, regular: r.regularHours }))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overtime Report</h1>
          <p className="text-sm text-muted-foreground">Generate payroll and overtime summaries</p>
        </div>
        {generated && report.length > 0 && (
          <Button variant="outline" onClick={handleExportCSV} disabled={exporting}>
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export CSV
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={loading} className="mb-0.5">
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
              ) : (
                'Generate Report'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {generated && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: 'Total Employees', value: report.length },
              { label: 'Total Hours', value: `${totals.totalHours.toFixed(1)}h` },
              { label: 'Overtime Hours', value: `${totals.overtimeHours.toFixed(1)}h`, highlight: true },
              { label: 'Regular Pay', value: `$${totals.regularPay.toLocaleString()}` },
              { label: 'Total Payroll', value: `$${totals.totalPay.toLocaleString()}`, highlight: true },
            ].map((s) => (
              <Card key={s.label} className={s.highlight ? 'border-orange-200' : ''}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-xl font-bold mt-1 ${s.highlight ? 'text-orange-600' : 'text-gray-900'}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4" />
                  Top Employees by Overtime Hours
                </CardTitle>
                <CardDescription>Top 10 employees ranked by overtime</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value, name) => [`${value.toFixed(2)}h`, name === 'overtime' ? 'Overtime' : 'Regular']}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="regular" name="regular" fill="#93c5fd" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="overtime" name="overtime" fill="#f97316" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Report Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detailed Report</CardTitle>
              <CardDescription>
                Period: {dayjs(from).format('MMM D, YYYY')} — {dayjs(to).format('MMM D, YYYY')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {report.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-muted-foreground">
                  No data for the selected period
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead className="text-right">Total Hrs</TableHead>
                      <TableHead className="text-right">Regular Hrs</TableHead>
                      <TableHead className="text-right">OT Hrs</TableHead>
                      <TableHead className="text-right">Regular Pay</TableHead>
                      <TableHead className="text-right">OT Pay</TableHead>
                      <TableHead className="text-right">Total Pay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.map((r) => (
                      <TableRow key={r.employeeId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{r.name}</p>
                            <p className="text-xs text-muted-foreground">{r.employeeId}</p>
                          </div>
                        </TableCell>
                        <TableCell>{r.department}</TableCell>
                        <TableCell>{r.designation}</TableCell>
                        <TableCell className="text-right">{r.totalHours.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{r.regularHours.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <span className={r.overtimeHours > 0 ? 'text-orange-600 font-medium' : ''}>
                            {r.overtimeHours.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">${r.regularPay.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${r.overtimePay.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold">${r.totalPay.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="font-bold">TOTALS</TableCell>
                      <TableCell className="text-right font-bold">{totals.totalHours.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold">{totals.regularHours.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold text-orange-600">{totals.overtimeHours.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold">${totals.regularPay.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold">${totals.overtimePay.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold text-green-700">${totals.totalPay.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
