import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PortalPlaceholderProps = {
  title: string;
  description?: string;
};

export function PortalPlaceholder({ title, description }: PortalPlaceholderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        This section is scaffolded for the role portal. Ride flow, maps, and messaging will be wired in
        upcoming phases.
      </CardContent>
    </Card>
  );
}
