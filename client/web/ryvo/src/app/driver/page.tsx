import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DriverHomePage() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle>Go online</CardTitle>
          <CardDescription>Receive ride offers near you.</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">Driver matching — Phase 4.</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Pending offer</CardTitle>
          <CardDescription>Accept within 30 seconds.</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">No pending offers.</CardContent>
      </Card>
    </div>
  );
}
