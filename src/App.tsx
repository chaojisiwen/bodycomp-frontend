/**
 * 应用入口
 */

import { AuthProvider } from '@/contexts/AuthContext'
import { CloudbaseProvider } from '@/contexts/CloudbaseContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ToastProvider } from '@/components/common'
import { ErrorBoundary } from '@/components/common'
import { Router } from '@/router'

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <CloudbaseProvider>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </CloudbaseProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
