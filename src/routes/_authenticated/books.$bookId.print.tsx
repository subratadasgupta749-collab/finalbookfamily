import { createFileRoute } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { getManuscript } from "@/lib/manuscript.functions";
import { getBook } from "@/lib/books.functions";
import { listPhotos, type PhotoCategory } from "@/lib/photos.functions";
import { BookRender } from "@/components/book/book-render";
import {
  DEFAULT_CUSTOMISATION,
  PAGE_SIZES,
  type BookCustomisation,
  type PageSizeId,
} from "@/lib/book-templates";

/* Print-stable queries: never refetch while the print dialog is open.
   A refetch during printing swaps the DOM under the print engine and makes
   Chrome emit an empty (0 KB) PDF. */
const printStable = {
  staleTime: Infinity,
  gcTime: Infinity,
  refetchOnWindowFocus: false as const,
  refetchOnMount: false as const,
  refetchOnReconnect: false as const,
  retry: 1,
};

const bookQ = (id: string) =>
  queryOptions({ queryKey: ["books", id], queryFn: () => getBook({ data: { id } }), ...printStable });
const manuscriptQ = (id: string) =>
  queryOptions({ queryKey: ["manuscript", id], queryFn: () => getManuscript({ data: { bookId: id } }), ...printStable });
const photosQ = (id: string) =>
  queryOptions({ queryKey: ["photos", id], queryFn: () => listPhotos({ data: { bookId: id } }), ...printStable });

const TOPIC_TO_CATEGORY: Record<string, PhotoCategory> = {
  childhood: "baby",
  school: "school",
  love: "wedding",
  marriage: "wedding",
  children: "family",
  family: "family",
  job: "career",
  career: "career",
  achievements: "career",
  challenges: "family",
  retirement: "retirement",
  advice: "family",
};

export const Route = createFileRoute("/_authenticated/books/$bookId/print")({
  head: () => ({
    meta: [{ title: "Print — My Family History Book" }, { name: "robots", content: "noindex" }],
  }),
  component: PrintPage,
});

/**
 * WYSIWYG print view.
 *
 * This route renders the exact same <BookRender /> component (and the exact
 * same CSS) used by the on-screen preview, inside a bare page with an @page
 * rule matching the chosen trim size. The browser's own print engine then
 * produces the PDF, so preview and PDF are the same rendering — same fonts,
 * colours, margins, photo frames, ornaments and page breaks.
 */
function PrintPage() {
  const { bookId } = Route.useParams();
  const [custom, setCustom] = useState<BookCustomisation>(DEFAULT_CUSTOMISATION);
  const [ready, setReady] = useState(false);
  const [printed, setPrinted] = useState(false);
  const [printing, setPrinting] = useState(false);
  /* Live flag readable from cleanup callbacks (state is stale there). */
  const printingRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`bk-custom-${bookId}`);
      if (raw) setCustom({ ...DEFAULT_CUSTOMISATION, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, [bookId]);

  /* Print lifecycle: keep the page, DOM and blob URLs alive until the user
     closes the tab manually. Chrome finishes writing the PDF *after*
     `afterprint` fires, so nothing may be torn down here. */
  useEffect(() => {
    const onBefore = () => {
      printingRef.current = true;
      setPrinting(true);
      console.log("[print] print dialog opened");
    };
    const onAfter = () => {
      console.log("[print] afterprint fired — leaving DOM intact, no cleanup, no auto-close");
      /* Deliberately delayed: Chrome may still be serialising the PDF. */
      window.setTimeout(() => {
        printingRef.current = false;
        setPrinting(false);
        console.log("[print] print session released (page still alive)");
      }, 5_000);
    };
    window.addEventListener("beforeprint", onBefore);
    window.addEventListener("afterprint", onAfter);
    return () => {
      window.removeEventListener("beforeprint", onBefore);
      window.removeEventListener("afterprint", onAfter);
    };
  }, []);

  useEffect(() => {
    const previousHtmlScheme = document.documentElement.style.colorScheme;
    const previousBodyScheme = document.body.style.colorScheme;
    document.documentElement.classList.add("bk-print-document");
    document.body.classList.add("bk-print-document");
    document.documentElement.style.colorScheme = "light";
    document.body.style.colorScheme = "light";
    return () => {
      /* Never revert styling while a print job is in flight. */
      if (printingRef.current) {
        console.log("[print] cleanup skipped — print still in progress");
        return;
      }
      console.log("[print] cleanup started");
      document.documentElement.classList.remove("bk-print-document");
      document.body.classList.remove("bk-print-document");
      document.documentElement.style.colorScheme = previousHtmlScheme;
      document.body.style.colorScheme = previousBodyScheme;
      console.log("[print] cleanup finished");
    };
  }, []);

  const bookQuery = useQuery(bookQ(bookId));
  const manuscriptQuery = useQuery(manuscriptQ(bookId));
  const photosQuery = useQuery(photosQ(bookId));

  const allPhotos = (photosQuery.data ?? []) as Array<{
    id: string;
    category: PhotoCategory;
    url: string | null;
    filename: string;
    caption?: string | null;
  }>;

  const photosByCategory = useMemo(
    () =>
      allPhotos.reduce(
        (acc, p) => {
          (acc[p.category] ||= []).push(p);
          return acc;
        },
        {} as Record<string, typeof allPhotos>,
      ),
    [allPhotos],
  );

  const loaded =
    !!bookQuery.data && !!manuscriptQuery.data && !photosQuery.isLoading;

  const size = PAGE_SIZES[custom.pageSize as PageSizeId] ?? PAGE_SIZES.book;

  /* Wait for webfonts + every image before handing over to the print engine.
     Broken/expired image URLs must not hang the print dialog forever. */
  useEffect(() => {
    if (!loaded) return;
    if (printingRef.current) return; // never touch the DOM mid-print
    let cancelled = false;
    const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
    const waitForImage = async (img: HTMLImageElement) => {
      img.loading = "eager";
      if (img.complete) return;
      await Promise.race([
        img.decode?.().catch(() => undefined),
        new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        }),
        wait(8_000),
      ]);
    };
    const run = async () => {
      try {
        await (document as any).fonts?.ready;
      } catch {
        /* ignore */
      }
      const imgs = Array.from(document.querySelectorAll<HTMLImageElement>(".bk-book img"));
      await Promise.all(imgs.map(waitForImage));
      await wait(1_000);
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (!cancelled) setReady(true);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [loaded]);

  useEffect(() => {
    if (!ready || printed) return;
    const auto = new URLSearchParams(window.location.search).get("auto") !== "0";
    if (!auto) return;
    setPrinted(true);
    const id = window.setTimeout(() => {
      console.log("[print] print started (assets settled)");
      window.print();
    }, 1_000);
    /* No clearTimeout on unmount-with-print: cleanup must not race the dialog. */
    return () => {
      if (!printingRef.current) window.clearTimeout(id);
    };
  }, [ready, printed]);



  const pageVars = {
    ["--bk-ratio" as any]: `${size.w} / ${size.h}`,
    ["--bk-margin" as any]: `${custom.margin}mm`,
    ["--bk-page-w" as any]: `${size.w}mm`,
    ["--bk-page-h" as any]: `${size.h}mm`,
  } as React.CSSProperties;

  return (
    <div className="bk-print-root" style={pageVars}>
      {/* Exact trim size for the print engine — no browser margins, the book
          pages carry their own typographic margins. */}
      <style>{`@page { size: ${size.w}mm ${size.h}mm; margin: 0; background: #ffffff; }`}</style>

      <div className="bk-print-bar print:hidden">
        <div>
          <strong>Print / Save as PDF</strong>
          <span>
            {" "}
            — {size.label} · {custom.margin}mm margins. In the print dialog choose
            “Save as PDF”, set margins to <em>None</em> and enable
            “Background graphics”.
          </span>
        </div>
        <div className="bk-print-bar__actions">
          <button
            onClick={() => {
              console.log("[print] print started (manual)");
              window.print();
            }}
            disabled={!ready}
          >
            {ready ? "Print / Save as PDF" : "Preparing…"}
          </button>
          <button
            className="ghost"
            onClick={() => {
              console.log("[print] window closed by user");
              window.close();
            }}
          >
            Close
          </button>
          {printing ? <span className="bk-print-bar__note">Saving… keep this tab open</span> : null}
        </div>
      </div>

      {!loaded ? (
        <p className="bk-print-status">Loading your book…</p>
      ) : (
        <div className={custom.bleed ? "bk-bleed-marks" : undefined}>
          <BookRender
            themeId={(manuscriptQuery.data?.manuscript?.theme ?? "classic") as string}
            custom={custom}
            book={bookQuery.data as any}
            manuscript={manuscriptQuery.data?.manuscript ?? null}
            chapters={(manuscriptQuery.data?.chapters ?? []) as any}
            photos={allPhotos}
            photosByCategory={photosByCategory}
            topicToCategory={TOPIC_TO_CATEGORY}
          />
        </div>
      )}
    </div>
  );
}
