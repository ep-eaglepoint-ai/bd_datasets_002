import { requireAdmin } from "@/src/app/admin/requireAdmin"
import EndpointsList from "../components/EndpointsList"

export default async function EndpointsPage() {
  await requireAdmin()
  return <EndpointsList />
}

