import { createContext, useState, ReactNode, useCallback } from 'react'

// Define the shape of your UserContext
interface UserContextType {
    user: { id: string; name: string } | null
    setUser: (user: { id: string; name: string } | null) => void
    logout: () => void
}

// Default values for the context
export const UserContext = createContext<UserContextType>({
    user: null,
    setUser: () => {
        console.warn('setUser called outside of UserProvider')
    },
    logout: () => {
        console.warn('logout called outside of UserProvider')
    },
})

interface UserProviderProps {
    children: ReactNode
}

// Provider component
export const UserProvider = ({ children }: UserProviderProps) => {
    const [user, setUserState] = useState<{ id: string; name: string } | null>(null)

    const setUser = useCallback((userData: { id: string; name: string } | null) => {
        setUserState(userData)
    }, [])

    const logout = useCallback(() => {
        setUserState(null)
    }, [])

    return (
        <UserContext.Provider value={{ user, setUser, logout }}>
            {children}
        </UserContext.Provider>
    )
}
