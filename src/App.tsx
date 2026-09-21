import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { LocaleProvider } from '@/context/LocaleContext'
import { SidebarProvider } from '@/context/SidebarContext'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { platformRouteTree } from '@/platform/routes'

export default function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <ToastProvider>
            <SidebarProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Navigate to="/platform" replace />} />
                  <Route path="/login" element={<Navigate to="/platform/login" replace />} />
                  {platformRouteTree}
                </Routes>
              </BrowserRouter>
            </SidebarProvider>
          </ToastProvider>
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  )
}
