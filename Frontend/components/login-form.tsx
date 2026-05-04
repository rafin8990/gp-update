"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Mail, Lock, User, Shield, Warehouse, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/context/auth-context"
import { demoAccounts } from "@/lib/api/auth"
import Link from "next/link"

export default function LoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both your username and password to continue",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      await login({ username, password })
      
      toast({
        title: "Login Successful",
        description: "Welcome back! Redirecting to dashboard...",
        variant: "default",
      })

      // Save to localStorage if remember me is checked
      if (rememberMe) {
        localStorage.setItem("assetiq-username", username)
      }

      router.push("/dashboard")
    } catch (error: any) {
      toast({
        title: "Authentication Failed",
        description: error.message || "The username or password you entered is incorrect. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async (role: keyof typeof demoAccounts) => {
    const demoAccount = demoAccounts[role]
    setUsername(demoAccount.username)
    setPassword(demoAccount.password)
    
    setIsLoading(true)
    
    try {
      await login({ username: demoAccount.username, password: demoAccount.password })
      
      toast({
        title: "Demo Login Successful",
        description: `Logged in as ${demoAccount.name}`,
        variant: "default",
      })

      router.push("/dashboard")
    } catch (error: any) {
      toast({
        title: "Demo Login Failed",
        description: error.message || "Failed to login with demo account",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-emerald-500 mb-8 text-center">
          Asset Management System
        </h2>
        <p className="text-gray-600 text-base mb-6 text-center">
          Track, manage, and optimize your assets in one place. Get real-time insights and make data-driven decisions.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <div className="relative">
            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="pl-10 py-6 border-2 border-gray-200 focus:border-emerald-500 focus:ring-0 shadow-sm rounded-lg"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <User className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 py-6 border-2 border-gray-200 focus:border-emerald-500 focus:ring-0 shadow-sm rounded-lg"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Lock className="h-5 w-5" />
            </div>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              className="border-gray-200 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
            />
            <label htmlFor="remember" className="text-sm text-gray-600">
            Remember my preference
            </label>
          </div>

          <Link 
            href="/forgot-password" 
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <div className="space-y-3">
          <Button
            type="submit"
            className="w-full py-6 bg-emerald-400 hover:bg-emerald-600 text-white font-medium transition-colors"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
          
          {/* Quick Login Buttons - Demo Accounts */}
          <div className="space-y-2">
            <div className="text-center text-sm text-gray-500 mb-3">
              Or quick login with demo accounts:
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="py-3 border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-emerald-600 hover:border-emerald-600 transition-colors"
                onClick={() => handleDemoLogin('super_admin')}
                disabled={isLoading}
                title="Super Admin - Password: superadmin123"
              >
                <Shield className="h-4 w-4 mr-2" />
                Super Admin
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="py-3 border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-emerald-600 hover:border-emerald-600 transition-colors"
                onClick={() => handleDemoLogin('admin')}
                disabled={isLoading}
                title="Admin - Password: admin123"
              >
                <Shield className="h-4 w-4 mr-2" />
                Admin
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="py-3 border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-emerald-600 hover:border-emerald-600 transition-colors"
                onClick={() => handleDemoLogin('manager')}
                disabled={isLoading}
                title="Manager - Password: manager123"
              >
                <Shield className="h-4 w-4 mr-2" />
                Manager
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="py-3 border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-emerald-600 hover:border-emerald-600 transition-colors"
                onClick={() => handleDemoLogin('johndoe')}
                disabled={isLoading}
                title="John Doe - Password: user123"
              >
                <Users className="h-4 w-4 mr-2" />
                John Doe
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="py-3 border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-emerald-600 hover:border-emerald-600 transition-colors"
                onClick={() => handleDemoLogin('janesmith')}
                disabled={isLoading}
                title="Jane Smith - Password: user123"
              >
                <Users className="h-4 w-4 mr-2" />
                Jane Smith
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="py-3 border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-emerald-600 hover:border-emerald-600 transition-colors"
                onClick={() => handleDemoLogin('testuser')}
                disabled={isLoading}
                title="Test User - Password: test123"
              >
                <Users className="h-4 w-4 mr-2" />
                Test User
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
