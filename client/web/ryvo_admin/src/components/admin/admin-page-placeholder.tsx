import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AdminPagePlaceholderProps = {
  title: string;
  description: string;
};

export function AdminPagePlaceholder({ title, description }: AdminPagePlaceholderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        Management UI connects to Ryvo APIs in the next iteration. Navigation and access control are
        active.
      </CardContent>
    </Card>
  );
}
