import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { subscribeNewsletter } from "@/lib/admin.functions";
import {
  BookHeart,
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  Linkedin,
  MessageCircle,
  Send,
  Music2,
  Image as ImageIcon,
  AtSign,
  HelpCircle,
  Mail,
  Phone,
  MapPin,
  Loader2,
  Check,
} from "lucide-react";
import { useSettings } from "@/hooks/use-settings";

const SOCIAL_ICONS: Record<string, { Icon: React.ComponentType<any>; label: string }> = {
  facebook: { Icon: Facebook, label: "Facebook" },
  instagram: { Icon: Instagram, label: "Instagram" },
  youtube: { Icon: Youtube, label: "YouTube" },
  pinterest: { Icon: PinterestIcon, label: "Pinterest" },
  x: { Icon: Twitter, label: "X" },
  twitter: { Icon: Twitter, label: "Twitter" },
  threads: { Icon: AtSign, label: "Threads" },
  linkedin: { Icon: Linkedin, label: "LinkedIn" },
  tiktok: { Icon: Music2, label: "TikTok" },
  whatsapp: { Icon: MessageCircle, label: "WhatsApp" },
  telegram: { Icon: Send, label: "Telegram" },
  quora: { Icon: QuoraIcon, label: "Quora" },
};

function PinterestIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.163 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/>
    </svg>
  );
}

function QuoraIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <path d="M11.996 2C6.262 2 1.611 6.512 1.611 12.064c0 4.148 2.457 7.72 6.002 9.273l-1.066 1.494c-.161.226-.264.512-.039.715.225.203.541.137.747-.052l2.678-2.464c.669.11 1.358.167 2.063.167 5.735 0 10.386-4.512 10.386-10.064C22.382 6.512 17.731 2 11.996 2zm-1.875 14.502c-3.158 0-5.717-2.559-5.717-5.717 0-3.158 2.559-5.717 5.717-5.717 3.158 0 5.717 2.559 5.717 5.717 0 1.258-.403 2.421-1.082 3.364l1.328 1.488-1.554 1.386-1.096-1.228a5.69 5.69 0 0 1-3.313 1.024zm2.144-8.883c-1.319-1.319-3.456-1.319-4.775 0-1.319 1.319-1.319 3.456 0 4.775 1.319 1.319 3.456 1.319 4.775 0 1.319-1.319 1.319-3.456 0-4.775z"/>
    </svg>
  );
}

type FooterLink = { label: string; href: string };

const DEFAULT_MENUS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Quick Links",
    links: [
      { label: "Home", href: "/" },
      { label: "About Us", href: "/about" },
      { label: "Contact Us", href: "/contact" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Refund Policy", href: "/refund" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "Disclaimer", href: "/disclaimer" },
      { label: "DMCA Policy", href: "/dmca" },
    ],
  },
];

type FooterMenu = { title: string; links: FooterLink[] };

function parseMenus(raw: unknown): FooterMenu[] {
  if (!raw) return DEFAULT_MENUS;
  try {
    const val = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(val) && val.length > 0) {
      const parsed: FooterMenu[] = val
        .map((c: any) => ({
          title: String(c?.title ?? ""),
          links: Array.isArray(c?.links)
            ? c.links.map((l: any) => ({ label: String(l?.label ?? ""), href: String(l?.href ?? "#") }))
            : [],
        }))
        .filter((c: FooterMenu) => c.title && c.links.length);
      if (parsed.length) return parsed;
    }
  } catch {
    /* fall through to defaults */
  }
  return DEFAULT_MENUS;
}

/**
 * The single global footer. Layout is identical on every public page;
 * only the content and colours come from Admin → Settings → Footer.
 */
export function SiteFooter() {
  const settings = useSettings() as any;
  const general = settings.general ?? {};
  const homepage = settings.homepage ?? {};
  const social = (settings.social ?? {}) as Record<string, string>;
  const footer = (settings.footer ?? {}) as Record<string, any>;

  const socialLinks = Object.entries(SOCIAL_ICONS)
    .map(([key, meta]) => ({ key, url: social[key]?.trim(), ...meta }))
    .filter((s) => !!s.url);

  const siteName = footer.logo_text || general.site_name || "My Family History Book";
  const logo = footer.logo_url || general.footer_logo_url || general.logo_url;
  const description =
    footer.description ||
    homepage.footer_description ||
    "Capture the life stories of your parents, grandparents and loved ones through an AI-guided interview, then transform their memories into a beautifully written keepsake book—ready to print, share and treasure for generations.";
  const email = footer.email || general.business_email || general.support_email;
  const phone = footer.phone || general.phone;
  const address = footer.address || general.company_address;
  const newsletterTitle = footer.newsletter_title || "Stay in touch";
  const newsletterText =
    footer.newsletter_text || "Quiet, occasional emails on preserving family stories.";
  const copyright =
    footer.copyright ||
    `© ${new Date().getFullYear()} ${general.company_name || siteName}. All rights reserved.`;

  const menus = parseMenus(footer.menus);

  const style = {
    "--ft-bg": footer.bg_color || "#4E342E",
    "--ft-text": footer.text_color || "#FBF7F2",
    "--ft-link": footer.link_color || "#E7D8C6",
    "--ft-hover": footer.hover_color || "#D4AF37",
  } as React.CSSProperties;

  const linkCls =
    "text-[color:var(--ft-link)] transition-colors duration-200 hover:text-[color:var(--ft-hover)]";

  return (
    <footer
      style={style}
      className="mt-auto bg-[color:var(--ft-bg)] text-[color:var(--ft-text)]"
    >
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1.2fr_1.4fr] lg:gap-12">
          {/* Brand */}
          <div>
            <Link
              to="/"
              className="flex items-center gap-2 font-serif text-lg font-semibold text-[color:var(--ft-text)]"
            >
              {logo ? (
                <img src={logo} alt={siteName} className="h-7 w-auto" />
              ) : (
                <BookHeart className="h-5 w-5 text-[color:var(--ft-hover)]" />
              )}
              <span>{siteName}</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[color:var(--ft-link)]">
              {description}
            </p>
            {socialLinks.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2.5">
                {socialLinks.map(({ key, url, Icon, label }) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid h-9 w-9 place-items-center rounded-full border border-[color:var(--ft-link)]/25 text-[color:var(--ft-link)] transition duration-200 hover:border-[color:var(--ft-hover)] hover:bg-[color:var(--ft-hover)] hover:text-[color:var(--ft-bg)]"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Menus */}
          {menus.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ft-text)]">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-3 text-sm">
                {col.links.map((l) => (
                  <li key={`${col.title}-${l.label}`}>
                    {l.href.startsWith("http") ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className={linkCls}>
                        {l.label}
                      </a>
                    ) : l.href.startsWith("/#") ? (
                      <a href={l.href} className={linkCls}>
                        {l.label}
                      </a>
                    ) : (
                      <Link to={l.href} className={linkCls}>
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact + newsletter */}
          <div>
            <NewsletterSection title={newsletterTitle} text={newsletterText} />

            <ul className="mt-6 space-y-2.5 text-sm text-[color:var(--ft-link)]">
              {email && (
                <li className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                  <a href={`mailto:${email}`} className={linkCls}>
                    {email}
                  </a>
                </li>
              )}
              {phone && (
                <li className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0" />
                  <a href={`tel:${phone}`} className={linkCls}>
                    {phone}
                  </a>
                </li>
              )}
              {address && (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-3 border-t border-[color:var(--ft-link)]/20 pt-6 text-xs text-[color:var(--ft-link)] sm:flex-row">
          <p>{copyright}</p>
        </div>
      </div>
    </footer>
  );
}

function NewsletterSection({ title, text }: { title: string; text: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      await subscribeNewsletter({ data: { email: trimmed } });
      toast.success("Thank you for subscribing to our newsletter!");
      setSubmitted(true);
      setEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to subscribe. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ft-text)]">
        {title}
      </h4>
      <p className="mt-4 text-sm text-[color:var(--ft-link)]">{text}</p>
      {submitted ? (
        <div className="mt-4 flex items-center gap-2 rounded-full border border-[color:var(--ft-hover)]/40 bg-[color:var(--ft-hover)]/10 px-4 py-2.5 text-sm font-medium text-[color:var(--ft-hover)]">
          <Check className="h-4 w-4 shrink-0" />
          <span>You're subscribed! Thank you for joining.</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <label htmlFor="footer-newsletter" className="sr-only">
            Email address
          </label>
          <input
            id="footer-newsletter"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            placeholder="you@family.com"
            className="w-full rounded-full border border-[color:var(--ft-link)]/30 bg-white/10 px-4 py-2.5 text-sm text-[color:var(--ft-text)] outline-none placeholder:text-[color:var(--ft-link)]/60 focus:border-[color:var(--ft-hover)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy}
            className="shrink-0 flex items-center justify-center gap-2 rounded-full bg-[color:var(--ft-hover)] px-4 py-2.5 text-sm font-medium text-[color:var(--ft-bg)] transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
          </button>
        </form>
      )}
    </>
  );
}
