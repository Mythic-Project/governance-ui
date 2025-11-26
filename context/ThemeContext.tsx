// PATH: ./context/ThemeContext.tsx
import { createContext, ReactNode, useState, useCallback } from 'react'

export type Theme = 'light' | 'dark'

export interface ThemeContextType {
    theme: Theme
    toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextType>({
    theme: 'light',
    toggleTheme: () => {
        // default noop
    },
})

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [theme, setTheme] = useState<Theme>('light')

    const toggleTheme = useCallback(() => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
    }, [])

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}
