import { AdminPagePlaceholder } from "@/components/admin/admin-page-placeholder";

export default function AdminUsersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">User management</h1>
      <AdminPagePlaceholder title="Users" description="Search, ban, and assign roles to platform users." />
    </div>
  );
}
