import type { ReactNode } from "react";
import type { BookTemplate } from "@/lib/book-templates";

export type Pic = { id: string; url: string | null; filename: string; caption?: string | null };
export type TimelineItem = { year?: string; event?: string };

export function label(t: BookTemplate, text: string) {
  return t.uppercaseLabels ? text.toUpperCase() : text;
}

/* ------------------------------------------------------------------ page */

export function Page({
  t,
  children,
  variant = "text",
  flow = false,
  className = "",
  header,
  footer,
  folio,
}: {
  t: BookTemplate;
  children: ReactNode;
  variant?: "text" | "plate" | "cover";
  flow?: boolean;
  className?: string;
  header?: string;
  footer?: string;
  folio?: number;
}) {
  return (
    <section
      className={`bk-page ${variant === "cover" ? "bk-page--cover" : ""} ${flow ? "bk-page--flow" : ""} ${className}`}
      style={{
        background:
          variant === "cover"
            ? undefined
            : t.background === "none"
              ? t.palette.paper
              : `${t.background}, ${t.palette.paper}`,
        color: t.palette.ink,
        fontFamily: t.fonts.body,
        fontSize: t.bodySize,
        lineHeight: t.bodyLeading,
      }}
    >
      {header && (
        <div
          className="bk-runhead"
          style={{ color: t.palette.muted, fontFamily: t.fonts.display }}
        >
          {label(t, header)}
        </div>
      )}
      <div className={variant === "plate" ? "bk-plate" : "bk-body"}>{children}</div>
      {footer !== undefined && (
        <div className="bk-runfoot" style={{ color: t.palette.muted }}>
          <span>{footer}</span>
          {folio !== undefined && <span>{folio}</span>}
        </div>
      )}
    </section>
  );
}

export function Measure({ t, children }: { t: BookTemplate; children: ReactNode }) {
  return (
    <div style={{ maxWidth: t.measure, marginInline: "auto", width: "100%" }}>{children}</div>
  );
}

/* -------------------------------------------------------------- ornaments */

export function Divider({ t }: { t: BookTemplate }) {
  const c = t.palette.accent;
  switch (t.divider) {
    case "ornament":
      return (
        <div className="bk-div" style={{ color: c, fontFamily: t.fonts.display }}>
          <span className="bk-div__line" style={{ background: t.palette.rule }} />
          <span className="bk-div__mark">❦</span>
          <span className="bk-div__line" style={{ background: t.palette.rule }} />
        </div>
      );
    case "dots":
      return (
        <div className="bk-div" style={{ color: c, letterSpacing: "1.2em" }}>
          • • •
        </div>
      );
    case "wave":
      return (
        <div className="bk-div" style={{ color: c }}>
          <svg width="120" height="12" viewBox="0 0 120 12" fill="none" aria-hidden>
            <path
              d="M0 6c10-8 20 8 30 0s20-8 30 0 20 8 30 0 20-8 30 0"
              stroke={c}
              strokeWidth="1.2"
              fill="none"
            />
          </svg>
        </div>
      );
    case "tape":
      return (
        <div className="bk-div">
          <span
            className="bk-tape"
            style={{ background: t.palette.accentSoft, borderColor: t.palette.rule }}
          />
        </div>
      );
    case "vine":
      return (
        <div className="bk-div" style={{ color: c, fontFamily: t.fonts.script, fontSize: "1.6rem" }}>
          ✦ ⁂ ✦
        </div>
      );
    case "block":
      return (
        <div className="bk-div">
          <span style={{ display: "block", width: "56px", height: "6px", background: c }} />
        </div>
      );
    default:
      return (
        <div className="bk-div">
          <span
            style={{ display: "block", width: "100%", height: "1px", background: t.palette.rule }}
          />
        </div>
      );
  }
}

export function Kicker({ t, children }: { t: BookTemplate; children: ReactNode }) {
  return (
    <div
      className="bk-kicker"
      style={{
        color: t.palette.accent,
        fontFamily: t.fonts.display,
        letterSpacing: t.uppercaseLabels ? "0.32em" : "0.06em",
      }}
    >
      {typeof children === "string" ? label(t, children) : children}
    </div>
  );
}

/* -------------------------------------------------------------- narrative */

export function Narrative({
  t,
  text,
  dropCap = false,
}: {
  t: BookTemplate;
  text: string;
  dropCap?: boolean;
}) {
  const paras = text.split(/\n\n+/).filter((p) => p.trim());
  return (
    <div className="bk-prose">
      {paras.map((p, i) => {
        if (i === 0 && dropCap && t.dropCap !== "none" && p.trim().length > 1) {
          const first = p.trim().charAt(0);
          const rest = p.trim().slice(1);
          return (
            <p key={i}>
              <span
                className={`bk-drop bk-drop--${t.dropCap}`}
                style={{
                  fontFamily: t.dropCap === "script" ? t.fonts.script : t.fonts.display,
                  color: t.dropCap === "boxed" ? t.palette.coverInk : t.palette.accent,
                  background: t.dropCap === "boxed" ? t.palette.accent : undefined,
                }}
              >
                {first}
              </span>
              {rest}
            </p>
          );
        }
        return <p key={i}>{p}</p>;
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- quotes */

export function Quote({
  t,
  text,
  attribution,
  force,
}: {
  t: BookTemplate;
  text: string;
  attribution?: string;
  force?: BookTemplate["quote"];
}) {
  const style = force ?? t.quote;
  const common = { color: t.palette.deep };
  switch (style) {
    case "center":
      return (
        <blockquote
          className="bk-quote bk-quote--center"
          style={{ ...common, fontFamily: t.fonts.display }}
        >
          <span className="bk-quote__mark" style={{ color: t.palette.rule }}>
            “
          </span>
          <p>{text}</p>
          {attribution && (
            <cite style={{ color: t.palette.muted, fontFamily: t.fonts.body }}>{attribution}</cite>
          )}
        </blockquote>
      );
    case "side":
      return (
        <blockquote
          className="bk-quote bk-quote--side"
          style={{ ...common, borderColor: t.palette.accent, fontFamily: t.fonts.display }}
        >
          <p>{text}</p>
          {attribution && <cite style={{ color: t.palette.muted }}>{attribution}</cite>}
        </blockquote>
      );
    case "box":
      return (
        <blockquote
          className="bk-quote bk-quote--box"
          style={{
            ...common,
            background: t.palette.accentSoft,
            borderColor: t.palette.rule,
            fontFamily: t.fonts.body,
          }}
        >
          <p>{text}</p>
          {attribution && <cite style={{ color: t.palette.muted }}>{attribution}</cite>}
        </blockquote>
      );
    case "handwritten":
      return (
        <blockquote
          className="bk-quote bk-quote--hand"
          style={{ ...common, fontFamily: t.fonts.script }}
        >
          <p>{text}</p>
          {attribution && <cite style={{ color: t.palette.muted }}>— {attribution}</cite>}
        </blockquote>
      );
    default:
      return (
        <blockquote
          className="bk-quote bk-quote--pull"
          style={{
            ...common,
            fontFamily: t.fonts.display,
            borderTopColor: t.palette.rule,
            borderBottomColor: t.palette.rule,
          }}
        >
          <p>{text}</p>
          {attribution && <cite style={{ color: t.palette.muted }}>{attribution}</cite>}
        </blockquote>
      );
  }
}

/* --------------------------------------------------------------- timeline */

export function Timeline({ t, items }: { t: BookTemplate; items: TimelineItem[] }) {
  const rows = items.filter((i) => i?.year || i?.event);
  if (!rows.length) return null;

  if (t.timeline === "horizontal")
    return (
      <div className="bk-tl-h">
        <span className="bk-tl-h__rail" style={{ background: t.palette.rule }} />
        {rows.map((r, i) => (
          <div key={i} className="bk-tl-h__item">
            <span className="bk-tl-h__dot" style={{ background: t.palette.accent }} />
            <div className="bk-tl-h__year" style={{ fontFamily: t.fonts.display, color: t.palette.accent }}>
              {r.year}
            </div>
            <div className="bk-tl-h__event">{r.event}</div>
          </div>
        ))}
      </div>
    );

  if (t.timeline === "cards")
    return (
      <div className="bk-tl-cards">
        {rows.map((r, i) => (
          <article
            key={i}
            className="bk-tl-card"
            style={{ borderColor: t.palette.rule, background: t.palette.accentSoft }}
          >
            <div style={{ fontFamily: t.fonts.display, color: t.palette.accent }}>{r.year}</div>
            <p>{r.event}</p>
          </article>
        ))}
      </div>
    );

  if (t.timeline === "journey")
    return (
      <div className="bk-tl-journey">
        {rows.map((r, i) => (
          <div key={i} className={`bk-tl-j__row ${i % 2 ? "is-right" : ""}`}>
            <span className="bk-tl-j__rail" style={{ background: t.palette.rule }} />
            <span className="bk-tl-j__dot" style={{ background: t.palette.accent }} />
            <div className="bk-tl-j__card">
              <div style={{ fontFamily: t.fonts.display, color: t.palette.accent }}>{r.year}</div>
              <p>{r.event}</p>
            </div>
          </div>
        ))}
      </div>
    );

  if (t.timeline === "illustrated")
    return (
      <ol className="bk-tl-ill">
        {rows.map((r, i) => (
          <li key={i}>
            <span className="bk-tl-ill__badge" style={{ borderColor: t.palette.accent, color: t.palette.accent, fontFamily: t.fonts.display }}>
              {r.year}
            </span>
            <span className="bk-tl-ill__line" style={{ background: t.palette.rule }} />
            <p>{r.event}</p>
          </li>
        ))}
      </ol>
    );

  return (
    <ol className="bk-tl-v" style={{ borderColor: t.palette.rule }}>
      {rows.map((r, i) => (
        <li key={i}>
          <span className="bk-tl-v__dot" style={{ background: t.palette.accent }} />
          <div style={{ fontFamily: t.fonts.display, color: t.palette.accent }}>{r.year}</div>
          <p>{r.event}</p>
        </li>
      ))}
    </ol>
  );
}

/* ----------------------------------------------------------------- photos */

function Figure({
  t,
  pic,
  ratio = "4 / 3",
  frame,
}: {
  t: BookTemplate;
  pic: Pic;
  ratio?: string;
  frame?: BookTemplate["photo"];
}) {
  const f = frame ?? t.photo;
  const caption = pic.caption || null;
  if (!pic.url) return null;
  return (
    <figure className={`bk-fig bk-fig--${f}`} style={{ borderColor: t.palette.rule }}>
      <img src={pic.url} alt={caption ?? pic.filename} loading="eager" decoding="sync" style={{ aspectRatio: ratio }} />
      {caption && (
        <figcaption
          style={{
            color: t.palette.muted,
            fontFamily: f === "polaroid" ? t.fonts.script : t.fonts.body,
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

export function PhotoBlock({ t, pics }: { t: BookTemplate; pics: Pic[] }) {
  const list = pics.filter((p) => p.url);
  if (!list.length) return null;
  const layout = t.photo;

  if (layout === "full" || list.length === 1)
    return (
      <div className="bk-photos bk-photos--full">
        <Figure t={t} pic={list[0]} ratio="3 / 2" />
      </div>
    );

  if (layout === "magazine")
    return (
      <div className="bk-photos bk-photos--mag">
        <Figure t={t} pic={list[0]} ratio="4 / 5" />
        <div className="bk-photos--mag__side">
          {list.slice(1, 3).map((p) => (
            <Figure key={p.id} t={t} pic={p} ratio="4 / 3" />
          ))}
        </div>
      </div>
    );

  if (layout === "collage")
    return (
      <div className="bk-photos bk-photos--collage">
        {list.slice(0, 5).map((p, i) => (
          <div key={p.id} className={`bk-collage__cell c${i}`}>
            <Figure t={t} pic={p} ratio={i === 0 ? "4 / 3" : "1 / 1"} />
          </div>
        ))}
      </div>
    );

  if (layout === "polaroid")
    return (
      <div className="bk-photos bk-photos--polaroid">
        {list.slice(0, 4).map((p, i) => (
          <div key={p.id} style={{ transform: `rotate(${(i % 2 ? 1 : -1) * (1.5 + i)}deg)` }}>
            <Figure t={t} pic={p} ratio="1 / 1" />
          </div>
        ))}
      </div>
    );

  return (
    <div className={`bk-photos bk-photos--grid ${list.length === 2 ? "is-duo" : list.length === 3 ? "is-trio" : ""}`}>
      {list.slice(0, 4).map((p) => (
        <Figure key={p.id} t={t} pic={p} ratio="1 / 1" />
      ))}
    </div>
  );
}

export function FullBleedPlate({ t, pic, caption }: { t: BookTemplate; pic: Pic; caption?: string }) {
  if (!pic.url) return null;
  return (
    <div className="bk-bleed">
      <img src={pic.url} alt={caption ?? pic.filename} loading="eager" decoding="sync" />
      {caption && (
        <div className="bk-bleed__cap" style={{ color: t.palette.coverInk, fontFamily: t.fonts.body }}>
          {caption}
        </div>
      )}
    </div>
  );
}

export function MemoryCard({
  t,
  title,
  children,
}: {
  t: BookTemplate;
  title: string;
  children: ReactNode;
}) {
  return (
    <article
      className="bk-memory"
      style={{ borderColor: t.palette.rule, background: t.palette.accentSoft }}
    >
      <h4 style={{ fontFamily: t.fonts.display, color: t.palette.deep }}>{title}</h4>
      <div>{children}</div>
    </article>
  );
}
