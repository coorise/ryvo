import { PortalPlaceholder } from "@/components/portal/portal-placeholder";
import { PortalTabShell } from "@/components/portal/portal-tab-shell";

export default function ClientLiveMapPage() {
  return (
    <PortalTabShell
      defaultTab="go-to"
      tabs={[
        {
          id: "go-to",
          label: "Go To",
          content: (
            <PortalPlaceholder
              title="Go To"
              description="Search destinations, see nearby drivers, and start checkout."
            />
          ),
        },
        {
          id: "requesting",
          label: "Requesting",
          content: (
            <PortalPlaceholder
              title="Requesting"
              description="Waiting for driver approval before payment proceeds."
            />
          ),
        },
        {
          id: "driving",
          label: "Driving",
          content: (
            <PortalPlaceholder
              title="Driving"
              description="Track your ride after the driver accepts."
            />
          ),
        },
      ]}
    />
  );
}
