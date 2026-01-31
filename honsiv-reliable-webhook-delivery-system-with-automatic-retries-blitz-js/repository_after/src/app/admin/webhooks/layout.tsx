"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import styles from "@/src/app/styles/WebhookAdmin.module.css"

export default function WebhooksAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + "/")
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f7fafc" }}>
      <div className={styles.container}>
        <nav className={styles.nav}>
          <Link
            href="/admin/webhooks/deliveries"
            className={`${styles.navLink} ${isActive("/admin/webhooks/deliveries") ? styles.navLinkActive : ""}`}
          >
            Deliveries
          </Link>
          <Link
            href="/admin/webhooks/endpoints"
            className={`${styles.navLink} ${isActive("/admin/webhooks/endpoints") ? styles.navLinkActive : ""}`}
          >
            Endpoints
          </Link>
          <Link
            href="/admin/webhooks/test"
            className={`${styles.navLink} ${isActive("/admin/webhooks/test") ? styles.navLinkActive : ""}`}
          >
            Test
          </Link>
          <div style={{ marginLeft: "auto" }}>
            <Link href="/" className={styles.navLink}>
              ← Home
            </Link>
          </div>
        </nav>
        {children}
      </div>
    </div>
  )
}

