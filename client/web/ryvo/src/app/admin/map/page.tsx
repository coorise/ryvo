import { AdminPagePlaceholder } from "@/components/admin/admin-page-placeholder";

export default function AdminMapPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Live map</h1>
      <AdminPagePlaceholder
        title="Real-time fleet map"
        description="Live driver and ride positions across active cities."
      />
    </div>
  );
}
