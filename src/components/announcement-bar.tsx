import { useSettings } from "@/hooks/use-settings";

export function AnnouncementBar() {
  const { announcement } = useSettings();
  if (!announcement?.enabled || !announcement.message) return null;
  if (announcement.expires_at) {
    const exp = new Date(announcement.expires_at).getTime();
    if (!isNaN(exp) && Date.now() > exp) return null;
  }
  return (
    <div
      className="w-full px-4 py-2 text-center text-sm"
      style={{
        backgroundColor: announcement.bg_color || "#8B5E3C",
        color: announcement.text_color || "#FFFFFF",
      }}
    >
      <span>{announcement.message}</span>
      {announcement.button_label && announcement.button_href && (
        <a
          href={announcement.button_href}
          className="ml-3 inline-block rounded-full bg-white/15 px-3 py-0.5 text-xs font-medium underline-offset-4 hover:underline"
        >
          {announcement.button_label}
        </a>
      )}
    </div>
  );
}
