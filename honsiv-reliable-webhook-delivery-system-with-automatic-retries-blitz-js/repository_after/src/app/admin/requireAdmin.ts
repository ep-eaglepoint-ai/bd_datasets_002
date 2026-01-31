import { getBlitzContext } from "../blitz-server"

export async function requireAdmin() {
  const ctx = await getBlitzContext()
  ctx.session.$authorize("ADMIN")
  return ctx
}

