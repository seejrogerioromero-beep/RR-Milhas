import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import type { UserRecord } from '@/types/database'

interface AuthContextType {
  user: UserRecord | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserRecord | null>(() => {
    return (pb.authStore.record as unknown as UserRecord) || null
  })
  const [token, setToken] = useState<string | null>(() => pb.authStore.token || null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      if (pb.authStore.isValid && pb.authStore.record) {
        const refreshed = await pb.collection('users').authRefresh()
        setUser(refreshed.record as unknown as UserRecord)
        setToken(refreshed.token)
      } else {
        setUser(null)
        setToken(null)
      }
    } catch {
      pb.authStore.clear()
      setUser(null)
      setToken(null)
    }
  }, [])

  useEffect(() => {
    // Initial verification
    const init = async () => {
      if (pb.authStore.isValid) {
        await refreshUser()
      } else {
        setUser(null)
        setToken(null)
      }
      setIsLoading(false)
    }

    init()

    const unsubscribe = pb.authStore.onChange((newToken, record) => {
      setToken(newToken || null)
      setUser((record as unknown as UserRecord) || null)
    })

    return () => {
      unsubscribe()
    }
  }, [refreshUser])

  const login = async (email: string, pass: string) => {
    const trimmed = email.toLowerCase().trim()
    const authData = await pb.collection('users').authWithPassword(trimmed, pass)
    setUser(authData.record as unknown as UserRecord)
    setToken(authData.token)
  }

  // OAuth2 nativo do PocketBase (popup/redirect tratado por /api/oauth2-redirect
  // no backend). O hook auth_gate.js barra qualquer e-mail != OWNER_EMAIL com
  // 403, então aqui só propagamos o resultado.
  const loginWithGoogle = async () => {
    const authData = await pb.collection('users').authWithOAuth2({ provider: 'google' })
    setUser(authData.record as unknown as UserRecord)
    setToken(authData.token)
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
    setToken(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        loginWithGoogle,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
