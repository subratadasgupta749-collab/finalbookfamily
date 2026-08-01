import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/checkout/cancel")({
  head: () => ({ meta: [{ title: "Checkout cancelled" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="mx-auto max-w-xl py-12">
      <Card className="p-10 text-center space-y-5">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-muted text-muted-foreground">
          <XCircle className="h-8 w-8" />
        </div>
        <h1 className="font-serif text-3xl">Checkout cancelled</h1>
        <p className="text-muted-foreground">No charge was made. You can try again anytime — your draft is safe.</p>
        <div className="flex gap-3">
          <Button asChild variant="outline" className="flex-1"><Link to="/dashboard">Back to dashboard</Link></Button>
          <Button asChild className="flex-1"><Link to="/checkout">Try again</Link></Button>
        </div>
      </Card>
    </div>
  ),
});
