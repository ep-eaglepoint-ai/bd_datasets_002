import { SecurePassword } from "@blitzjs/auth/secure-password"
import db from "./index"

async function seed() {
  const email = process.env.ADMIN_EMAIL ?? "admin@eaglepointai.com"
  const password = process.env.ADMIN_PASSWORD ?? "million@eaglepoint2026"
  const hashedPassword = await SecurePassword.hash(password)

  const user = await db.user.upsert({
    where: { email },
    update: {
      role: "ADMIN",
      hashedPassword,
    },
    create: {
      email,
      role: "ADMIN",
      hashedPassword,
    },
  })

  console.log(`Admin user ready: ${user.email}`)
}

seed()
  .catch((error) => {
    console.error("Admin seed failed", error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })

