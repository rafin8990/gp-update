"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authAPI, User, LoginRequest, RegisterRequest } from '../api/auth'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  register: (userData: RegisterRequest) => Promise<void>
  logout: () => void
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored auth data on mount
    const storedUser = localStorage.getItem('user')
    const token = localStorage.getItem('authToken')
    
    if (storedUser && token) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authAPI.login(credentials)
      
      if (response.success) {
        const { user, accessToken, refreshToken } = response.data
        
        // Store tokens and user data
        authAPI.setTokens(accessToken, refreshToken)
        setUser(user)
        localStorage.setItem('user', JSON.stringify(user))
      } else {
        throw new Error(response.message || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const register = async (userData: RegisterRequest) => {
    try {
      const response = await authAPI.register(userData)
      
      if (response.success) {
        const { user, accessToken, refreshToken } = response.data
        
        // Store tokens and user data
        authAPI.setTokens(accessToken, refreshToken)
        setUser(user)
        localStorage.setItem('user', JSON.stringify(user))
      } else {
        throw new Error(response.message || 'Registration failed')
      }
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  }

  const logout = () => {
    authAPI.logout()
    setUser(null)
  }

  const refreshAuth = async () => {
    try {
      const { refreshToken } = authAPI.getTokens()
      
      if (refreshToken) {
        const response = await authAPI.refreshToken(refreshToken)
        
        if (response.success) {
          const { accessToken, refreshToken: newRefreshToken } = response.data
          authAPI.setTokens(accessToken, newRefreshToken)
        } else {
          logout()
        }
      } else {
        logout()
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      logout()
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 