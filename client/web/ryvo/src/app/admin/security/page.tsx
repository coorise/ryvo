import { AdminPagePlaceholder } from "@/components/admin/admin-page-placeholder";

export default function AdminSecurityPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Security logs</h1>
      <AdminPagePlaceholder title="Security" description="Failed logins, suspicious sessions, and policy events." />
    </div>
  );
}
