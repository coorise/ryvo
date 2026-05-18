import { AdminPagePlaceholder } from "@/components/admin/admin-page-placeholder";

export default function AdminRidesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Ride management</h1>
      <AdminPagePlaceholder
        title="Trips & requests"
        description="Monitor active rides, cancellations, and disputes."
      />
    </div>
  );
}
