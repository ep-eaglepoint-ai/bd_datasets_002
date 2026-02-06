"use client"
import Link from "next/link"
import styles from "./AdminButton.module.css"

export function AdminButton() {
  return (
    <Link href="/admin/webhooks" className={styles.button}>
      ⚙️ Webhook Admin Dashboard
    </Link>
  )
}

