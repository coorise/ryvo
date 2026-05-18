import { AdminPagePlaceholder } from "@/components/admin/admin-page-placeholder";

export default function AdminDriversPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Driver validation</h1>
      <AdminPagePlaceholder title="KYC queue" description="Review documents and approve or reject driver applications." />
    </div>
  );
}
