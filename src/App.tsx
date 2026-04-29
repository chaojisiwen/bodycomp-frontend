/**
 * 应用入口
 */

import { AuthProvider } from '@/contexts/AuthContext'
import { CloudbaseProvider } from '@/contexts/CloudbaseContext'
import { ToastProvider } from '@/components/common'
import { ErrorBoundary } from '@/components/common'
import { Router } from '@/router'

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <CloudbaseProvider>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </CloudbaseProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
