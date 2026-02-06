import db from "db"
import { SecurePassword } from "@blitzjs/auth/secure-password"
import { enqueueWebhookEvent } from "src/webhooks/enqueueWebhookEvent"

export default async function signup(input: { password: string; email: string }, ctx: any) {
  const blitzContext = ctx
  const hashedPassword = await SecurePassword.hash((input.password as string) || "test-password")
  const email = (input.email as string) || "test" + Math.random() + "@test.com"
  const user = await db.user.create({
    data: { email, hashedPassword, role: "USER" },
  })

  await blitzContext.session.$create({
    userId: user.id,
    role: "USER",
  })

  // Trigger webhook for new user signup
  try {
    await enqueueWebhookEvent("user.created", `user_${user.id}`, {
      userId: user.id,
      email: user.email,
      createdAt: user.createdAt,
    })
  } catch (error) {
    console.error("Failed to enqueue user.created webhook:", error)
    // Don't fail signup if webhook fails
  }

  return { userId: blitzContext.session.userId, ...user, email: input.email }
}
