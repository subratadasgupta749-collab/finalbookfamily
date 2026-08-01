import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mail } from "lucide-react";
import { submitContactMessage } from "@/lib/admin.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — My Family History Book" },
      { name: "description", content: "Get in touch with the My Family History Book team." },
      { property: "og:title", content: "Contact — My Family History Book" },
      { property: "og:description", content: "Get in touch with our team." },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  message: z.string().trim().min(10, "Please write at least 10 characters").max(2000),
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = contactSchema.safeParse(form);
    if (!p.success) return toast.error(p.error.issues[0].message);
    setBusy(true);
    try {
      await submitContactMessage({ data: p.data });
      toast.success("Thanks! We'll be in touch soon.");
      setForm({ name: "", email: "", message: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to send. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SiteLayout>
      <div className="mx-auto grid max-w-5xl gap-12 px-4 py-16 sm:px-6 sm:py-24 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-primary">Contact</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            We'd love to hear from you.
          </h1>
          <p className="mt-4 text-muted-foreground">
            Have a question, feedback, or a family story that inspired you? Send us a note — we read every message.
          </p>
          <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
            <Mail className="h-4 w-4 text-primary" />
            hello@myfamilyhistorybook.app
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border/60 bg-background p-6 shadow-sm">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} required />
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5} maxLength={2000} required />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send message
          </Button>
        </form>
      </div>
    </SiteLayout>
  );
}
