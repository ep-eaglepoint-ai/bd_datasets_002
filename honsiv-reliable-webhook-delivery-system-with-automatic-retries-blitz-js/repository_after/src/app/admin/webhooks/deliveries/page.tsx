import { requireAdmin } from "@/src/app/admin/requireAdmin"
import DeliveriesList from "../components/DeliveriesList"

export default async function DeliveriesPage() {
  await requireAdmin()
  return <DeliveriesList />
}

