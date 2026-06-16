import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import LandingPage from './LandingPage.jsx'
import App from './App.jsx'

function Root() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <App /> : <LandingPage />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>,
)
