import { VaultDashboard } from "@/components/vault/VaultDashboard";
import { VaultGuard } from "@/components/vault/VaultGuard";
// home page
export default function Home() {
  return (
    <VaultGuard>
      <VaultDashboard />
    </VaultGuard>
  );
}
