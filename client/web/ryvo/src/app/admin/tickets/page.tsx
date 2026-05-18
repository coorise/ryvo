import { AdminPagePlaceholder } from "@/components/admin/admin-page-placeholder";

export default function AdminTicketsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Support tickets</h1>
      <AdminPagePlaceholder title="Inbox" description="Reply to rider and driver support conversations." />
    </div>
  );
}
