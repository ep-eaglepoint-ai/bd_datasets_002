"use client"
import logout from "../mutations/logout"
import { useRouter } from "next/navigation"
import { useMutation } from "@blitzjs/rpc"

export function LogoutButton() {
  const router = useRouter()
  const [logoutMutation] = useMutation(logout)
  return (
    <button
      onClick={async () => {
        await logoutMutation()
        router.refresh()
      }}
      style={{
        padding: '12px 24px',
        background: '#e2e8f0',
        color: '#2d3748',
        borderRadius: '8px',
        border: 'none',
        fontWeight: '600',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        width: '100%'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = '#cbd5e0'
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = '#e2e8f0'
      }}
    >
      Logout
    </button>
  )
}
