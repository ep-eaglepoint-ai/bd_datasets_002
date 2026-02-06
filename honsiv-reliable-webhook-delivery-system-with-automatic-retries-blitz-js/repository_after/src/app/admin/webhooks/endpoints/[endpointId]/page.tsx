import { requireAdmin } from "@/src/app/admin/requireAdmin"
import EndpointForm from "@/src/app/admin/webhooks/components/EndpointForm"

export default async function EditEndpointPage({
  params,
}: {
  params: Promise<{ endpointId: string }>
}) {
  await requireAdmin()
  const { endpointId } = await params
  return <EndpointForm mode="edit" endpointId={Number(endpointId)} />
}

