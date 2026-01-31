import { requireAdmin } from "@/src/app/admin/requireAdmin"
import EndpointForm from "@/src/app/admin/webhooks/components/EndpointForm"

export default async function NewEndpointPage() {
  await requireAdmin()
  return <EndpointForm mode="create" />
}

