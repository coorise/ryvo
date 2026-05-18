import { AdminPagePlaceholder } from "@/components/admin/admin-page-placeholder";

export default function AdminAuditPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Audit logs</h1>
      <AdminPagePlaceholder title="Audit trail" description="Immutable log of admin and system actions." />
    </div>
  );
}
