import { PortalPlaceholder } from "@/components/portal/portal-placeholder";
import { PortalTabShell } from "@/components/portal/portal-tab-shell";

export default function DriverLiveMapPage() {
  return (
    <PortalTabShell
      defaultTab="live"
      tabs={[
        {
          id: "live",
          label: "Live",
          content: (
            <PortalPlaceholder
              title="Live map"
              description="Go online, set zone pricing, and show your presence on the map."
            />
          ),
        },
        {
          id: "incoming",
          label: "Incoming",
          content: (
            <PortalPlaceholder
              title="Incoming requests"
              description="Accept or refuse ride requests before the client completes payment."
            />
          ),
        },
        {
          id: "driving",
          label: "Driving",
          content: (
            <PortalPlaceholder
              title="Driving"
              description="Visible after you accept a request — navigation to client and destination."
            />
          ),
        },
      ]}
    />
  );
}
