import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/settings.functions";

export type PublicSettings = {
  general?: {
    site_name?: string;
    tagline?: string;
    logo_url?: string;
    dark_logo_url?: string;
    footer_logo_url?: string;
    favicon_url?: string;
    company_name?: string;
    company_address?: string;
    business_email?: string;
    support_email?: string;
    phone?: string;
    timezone?: string;
    date_format?: string;
    time_format?: string;
    country?: string;
    default_currency?: string;
    currency_symbol?: string;
    default_language?: string;
    available_languages?: string[];
  };
  seo?: Record<string, any>;
  social?: Record<string, string>;
  theme?: Record<string, any>;
  homepage?: {
    hero_title?: string;
    hero_subtitle?: string;
    cta_label?: string;
    cta_href?: string;
    hero_image?: string;
    about_section?: string;
    footer_description?: string;
    features?: any[];
    testimonials?: any[];
    pricing?: any[];
    faq?: any[];
  };
  footer?: {
    logo_url?: string;
    logo_text?: string;
    description?: string;
    menus?: any;
    email?: string;
    phone?: string;
    address?: string;
    copyright?: string;
    newsletter_title?: string;
    newsletter_text?: string;
    bg_color?: string;
    text_color?: string;
    link_color?: string;
    hover_color?: string;
  };
  blog?: Record<string, any>;
  announcement?: {
    enabled?: boolean;
    message?: string;
    button_label?: string;
    button_href?: string;
    bg_color?: string;
    text_color?: string;
    expires_at?: string | null;
  };
  legal?: Record<string, string>;
  media?: Record<string, any>;
  book_generation?: {
    enabled?: boolean;
    est_time_seconds?: number;
    progress_messages?: string[];
    stages?: string[];
    animation_speed?: "slow" | "normal" | "fast";
    success_message?: string;
    error_message?: string;
  };
};

const SettingsCtx = createContext<PublicSettings>({});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => getPublicSettings() as Promise<PublicSettings>,
    staleTime: 60_000,
  });
  return (
    <SettingsCtx.Provider value={data ?? {}}>{children}</SettingsCtx.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsCtx);
}
