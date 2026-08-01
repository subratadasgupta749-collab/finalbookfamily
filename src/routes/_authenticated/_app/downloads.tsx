import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Printer, FileType } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { getDashboard } from "@/lib/dashboard.functions";
import { Panel, EmptyState, SkeletonBlock, formatBytes } from "@/components/dashboard/primitives";

export const Route = createFileRoute("/_authenticated/_app/downloads")({
  head: () => ({
    meta: [{ title: "Downloads — My Family History Book" }, { name: "robots", content: "noindex" }],
  }),
  component: DownloadsPage,
});

const icons: Record<string, typeof FileText> = {
  pdf: FileText,
  docx: FileType,
  print_pdf: Printer,
};

function DownloadsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Downloads</h1>
        <p className="mt-1 text-muted-foreground">
          Every export you've generated — PDF, DOCX and print-ready files.
        </p>
      </div>

      {isLoading ? (
        <SkeletonBlock className="h-64" />
      ) : !data || data.downloads.length === 0 ? (
        <EmptyState
          icon={Download}
          title="No downloads yet"
          description="Generate your book export from a book's preview page and it will appear here."
        />
      ) : (
        <Panel title={`${data.downloads.length} file${data.downloads.length > 1 ? "s" : ""}`}>
          <ul className="divide-y divide-border/60">
            {data.downloads.map((d: any) => {
              const Icon = icons[d.kind] ?? FileText;
              return (
                <li
                  key={d.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.filename}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {String(d.kind).replace("_", " ").toUpperCase()} ·{" "}
                        {d.book_name ? `${d.book_name} · ` : ""}
                        {formatBytes(d.size_bytes)} ·{" "}
                        {format(new Date(d.created_at), "d MMM yyyy")}
                      </p>
                    </div>
                  </div>
                  {d.url && (
                    <Button asChild size="sm" variant="secondary">
                      <a href={d.url} target="_blank" rel="noreferrer">
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                      </a>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </div>
  );
}
