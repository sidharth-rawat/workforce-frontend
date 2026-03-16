import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Set axios base URL — falls back to localhost in development
  axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5050'

  useEffect(() => {
    const storedToken = localStorage.getItem('wf_token')
    if (storedToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
      setToken(storedToken)
      // Verify token
      axios.get('/api/auth/me')
        .then((res) => {
          setUser(res.data.user)
        })
        .catch(() => {
          localStorage.removeItem('wf_token')
          delete axios.defaults.headers.common['Authorization']
          setToken(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password })
    const { token: newToken, user: newUser } = res.data
    localStorage.setItem('wf_token', newToken)
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    setToken(newToken)
    setUser(newUser)
    return newUser
  }

  const logout = () => {
    localStorage.removeItem('wf_token')
    delete axios.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
