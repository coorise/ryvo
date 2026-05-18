import { AdminPagePlaceholder } from "@/components/admin/admin-page-placeholder";

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Payment audit</h1>
      <AdminPagePlaceholder title="Payments" description="Review captures, refunds, and payout batches." />
    </div>
  );
}
