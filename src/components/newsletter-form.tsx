import { useState } from "react";
import { subscribeNewsletterFn } from "@/lib/email.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle2, Mail, Loader2 } from "lucide-react";

interface NewsletterFormProps {
  source?: "Homepage" | "Footer" | "Popup" | "Landing Page" | string;
  placeholder?: string;
  buttonText?: string;
  showNameInput?: boolean;
  className?: string;
  onSuccess?: () => void;
}

export function NewsletterForm({
  source = "Footer",
  placeholder = "Enter your email...",
  buttonText = "Subscribe",
  showNameInput = false,
  className = "",
  onSuccess,
}: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim();
    console.log("[Newsletter] Form Submitted:", { email: cleanEmail, name, source });

    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    console.log("[Newsletter] Validation Passed");
    setLoading(true);

    try {
      console.log("[Newsletter] Database Write Started via API");
      await subscribeNewsletterFn({
        data: {
          email: cleanEmail,
          name: name.trim() || null,
          source: source || "Footer",
        },
      });

      console.log("[Newsletter] Database Write Success");
      setSubscribed(true);
      toast.success("Thank you for subscribing! Please check your inbox for our welcome email.");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("[Newsletter] Database Write Failed:", err?.message || err);
      toast.error("Subscription failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (subscribed) {
    return (
      <div className={`flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400 ${className}`}>
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <span>Thank you for subscribing! A welcome email is on its way.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col sm:flex-row gap-2 ${className}`}>
      {showNameInput && (
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          className="bg-background text-xs"
          disabled={loading}
        />
      )}
      <div className="relative flex-1">
        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          className="pl-9 text-xs bg-background"
          disabled={loading}
        />
      </div>
      <Button type="submit" disabled={loading} className="shrink-0 text-xs">
        {loading ? (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Subscribing…
          </>
        ) : (
          buttonText
        )}
      </Button>
    </form>
  );
}
