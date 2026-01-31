import Link from "next/link"
import { invoke } from "./blitz-server"
import { LogoutButton } from "./(auth)/components/LogoutButton"
import { AdminButton } from "./components/AdminButton"
import getCurrentUser from "./users/queries/getCurrentUser"

export default async function Home() {
  const currentUser = await invoke(getCurrentUser, null)
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '48px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: '700',
          marginBottom: '8px',
          color: '#1a202c'
        }}>
          Webhook Delivery System
        </h1>
        
        <p style={{ 
          color: '#718096', 
          marginBottom: '32px',
          fontSize: '16px'
        }}>
          Production-ready webhook retry system with automatic backoff
        </p>

        {currentUser ? (
          <div>
            <div style={{
              background: '#f7fafc',
              padding: '24px',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <p style={{ 
                color: '#4a5568', 
                marginBottom: '8px',
                fontSize: '14px'
              }}>
                Logged in as
              </p>
              <p style={{ 
                fontWeight: '600', 
                color: '#2d3748',
                fontSize: '16px',
                marginBottom: '8px'
              }}>
                User ID: {currentUser.id}
              </p>
              <p style={{
                display: 'inline-block',
                padding: '4px 12px',
                background: currentUser.role === 'ADMIN' ? '#48bb78' : '#4299e1',
                color: 'white',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {currentUser.role}
              </p>
            </div>

            {currentUser.role === "ADMIN" && (
              <AdminButton />
            )}

            <LogoutButton />
          </div>
        ) : (
          <div>
            <p style={{ 
              color: '#4a5568', 
              marginBottom: '24px',
              fontSize: '14px'
            }}>
              Please login to access the webhook management system
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Link 
                href="/login" 
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                Login
              </Link>
              <Link 
                href="/signup" 
                style={{
                  padding: '12px 24px',
                  background: '#e2e8f0',
                  color: '#2d3748',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}

        <div style={{
          marginTop: '32px',
          paddingTop: '24px',
          borderTop: '1px solid #e2e8f0'
        }}>
          <p style={{ 
            color: '#a0aec0', 
            fontSize: '12px',
            marginBottom: '8px'
          }}>
            Features
          </p>
          <div style={{ 
            display: 'grid', 
            gap: '8px',
            fontSize: '13px',
            color: '#4a5568',
            textAlign: 'left'
          }}>
            <div>✓ Automatic retry with exponential backoff</div>
            <div>✓ HMAC-SHA256 signature verification</div>
            <div>✓ Full delivery audit trail</div>
            <div>✓ Manual retry capability</div>
          </div>
        </div>
      </div>
    </div>
  )
}
