import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClientHomePage() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Book a ride</CardTitle>
          <CardDescription>Search destination and request a driver.</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">Coming soon — Phase 4 ride flow.</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Active trip</CardTitle>
          <CardDescription>Track your driver in real time.</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">No active trip.</CardContent>
      </Card>
    </div>
  );
}
