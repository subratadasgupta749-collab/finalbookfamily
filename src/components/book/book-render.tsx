import { getTemplate, resolveDesign, type BookCustomisation, type BookTemplate } from "@/lib/book-templates";
import {
  Divider,
  FullBleedPlate,
  Kicker,
  Measure,
  MemoryCard,
  Narrative,
  Page,
  PhotoBlock,
  Quote,
  Timeline,
  label,
  type Pic,
} from "./elements";

export type Chapter = {
  id: string;
  position: number;
  topic: string;
  title: string;
  narrative: string;
  timeline: any;
  quotes: any;
};

export type BookMeta = {
  name: string;
  nickname?: string | null;
  date_of_birth?: string | null;
  country?: string | null;
  relationship?: string | null;
};

type Props = {
  themeId: string;
  custom: BookCustomisation;
  book: BookMeta;
  manuscript: { introduction?: string | null; ending?: string | null } | null;
  chapters: Chapter[];
  photos: Pic[];
  photosByCategory: Record<string, Pic[]>;
  topicToCategory: Record<string, string>;
};

/* --------------------------------------------------------------- covers */

function Cover({ t, book, pic }: { t: BookTemplate; book: BookMeta; pic: Pic | null }) {
  const sub = [book.date_of_birth, book.country].filter(Boolean).join(" · ");
  const shell = (children: React.ReactNode, style?: React.CSSProperties) => (
    <section className="bk-page bk-page--cover" style={style}>
      {children}
    </section>
  );

  const titleStyle: React.CSSProperties = {
    fontFamily: t.fonts.display,
    letterSpacing: t.headingTracking,
  };

  if (t.cover === "fullbleed" && pic?.url)
    return shell(
      <div className="bk-cover bk-cover--bleed">
        <img src={pic.url} alt={book.name} />
        <div className="bk-cover__scrim" />
        <div className="bk-cover__content" style={{ color: "#fff" }}>
          <Kicker t={{ ...t, palette: { ...t.palette, accent: "rgba(255,255,255,0.8)" } }}>
            A Family History
          </Kicker>
          <h1 style={titleStyle}>{book.name}</h1>
          {sub && <p>{sub}</p>}
        </div>
      </div>,
      { background: t.palette.deep },
    );

  if (t.cover === "typeonly")
    return shell(
      <div className="bk-cover bk-cover--type" style={{ background: t.palette.paper, color: t.palette.ink }}>
        <div className="bk-cover__rule" style={{ background: t.palette.rule }} />
        <h1 style={titleStyle}>{book.name}</h1>
        {book.nickname && <p className="bk-cover__nick" style={{ fontFamily: t.fonts.script }}>“{book.nickname}”</p>}
        <div className="bk-cover__rule" style={{ background: t.palette.rule }} />
        <p className="bk-cover__meta" style={{ color: t.palette.muted }}>{sub}</p>
      </div>,
    );

  if (t.cover === "masthead")
    return shell(
      <div className="bk-cover bk-cover--masthead" style={{ background: t.palette.paper, color: t.palette.ink }}>
        <div className="bk-cover__masthead" style={{ fontFamily: t.fonts.display, borderColor: t.palette.rule }}>
          {label(t, "A Life in Stories")}
        </div>
        {pic?.url && <img className="bk-cover__hero" src={pic.url} alt={book.name} />}
        <div className="bk-cover__band" style={{ background: t.palette.accent, color: "#fff" }}>
          <h1 style={titleStyle}>{book.name}</h1>
          {sub && <p>{sub}</p>}
        </div>
      </div>,
    );

  if (t.cover === "polaroid" || t.cover === "collage")
    return shell(
      <div className={`bk-cover bk-cover--${t.cover}`} style={{ background: t.palette.paper, color: t.palette.ink }}>
        <Kicker t={t}>A Family History</Kicker>
        <h1 style={titleStyle}>{book.name}</h1>
        {pic?.url && (
          <div className="bk-cover__polaroid" style={{ borderColor: t.palette.rule }}>
            <img src={pic.url} alt={book.name} />
            {book.nickname && <span style={{ fontFamily: t.fonts.script }}>“{book.nickname}”</span>}
          </div>
        )}
        <p className="bk-cover__meta" style={{ color: t.palette.muted }}>{sub}</p>
      </div>,
    );

  if (t.cover === "crest" || t.cover === "framed")
    return shell(
      <div className="bk-cover bk-cover--framed" style={{ background: t.palette.paper, color: t.palette.ink }}>
        <div className="bk-cover__frame" style={{ borderColor: t.palette.rule }}>
          {t.cover === "crest" && (
            <div className="bk-cover__crest" style={{ borderColor: t.palette.accent, color: t.palette.accent, fontFamily: t.fonts.display }}>
              {book.name.charAt(0)}
            </div>
          )}
          <Kicker t={t}>The Life & Times of</Kicker>
          <h1 style={titleStyle}>{book.name}</h1>
          {book.nickname && <p className="bk-cover__nick" style={{ fontFamily: t.fonts.script }}>“{book.nickname}”</p>}
          {pic?.url && (
            <div className="bk-cover__oval">
              <img src={pic.url} alt={book.name} />
            </div>
          )}
          <p className="bk-cover__meta" style={{ color: t.palette.muted }}>{sub}</p>
        </div>
      </div>,
    );

  if (t.cover === "band")
    return shell(
      <div className="bk-cover bk-cover--leather" style={{ background: t.palette.deep, color: t.palette.coverInk }}>
        <div className="bk-cover__spine" style={{ borderColor: "rgba(255,255,255,0.16)" }} />
        <div className="bk-cover__deboss" style={{ borderColor: "rgba(255,255,255,0.28)" }}>
          <Kicker t={{ ...t, palette: { ...t.palette, accent: t.palette.coverInk } }}>Memoirs</Kicker>
          <h1 style={titleStyle}>{book.name}</h1>
          {book.nickname && <p style={{ fontFamily: t.fonts.script }}>“{book.nickname}”</p>}
          <p className="bk-cover__meta">{sub}</p>
        </div>
      </div>,
    );

  if (t.cover === "illustrated")
    return shell(
      <div className="bk-cover bk-cover--story" style={{ background: `${t.background}, ${t.palette.paper}`, color: t.palette.ink }}>
        <h1 style={{ ...titleStyle, fontSize: "4rem" }}>{book.name}</h1>
        <p style={{ fontFamily: t.fonts.body, color: t.palette.muted }}>{label(t, "A Storybook of a Life")}</p>
        {pic?.url && (
          <div className="bk-cover__round">
            <img src={pic.url} alt={book.name} />
          </div>
        )}
        <p className="bk-cover__meta" style={{ color: t.palette.muted }}>{sub}</p>
      </div>,
    );

  // plate (default)
  return shell(
    <div className="bk-cover bk-cover--plate" style={{ background: t.palette.paper, color: t.palette.ink }}>
      <Kicker t={t}>A Family History</Kicker>
      <h1 style={titleStyle}>{book.name}</h1>
      {book.nickname && <p className="bk-cover__nick" style={{ fontFamily: t.fonts.script }}>“{book.nickname}”</p>}
      <div className="bk-cover__rule" style={{ background: t.palette.rule }} />
      {pic?.url && (
        <div className="bk-cover__plate">
          <img src={pic.url} alt={book.name} />
        </div>
      )}
      <p className="bk-cover__meta" style={{ color: t.palette.muted }}>{sub}</p>
    </div>,
  );
}

/* -------------------------------------------------------- chapter opener */

function ChapterOpener({
  t,
  ch,
  pic,
  n,
}: {
  t: BookTemplate;
  ch: Chapter;
  pic: Pic | null;
  n: number;
}) {
  const title = ch.title || ch.topic;
  const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][n - 1] ?? String(n);

  if (t.opener === "photo" && pic?.url)
    return (
      <Page t={t} variant="plate">
        <div className="bk-opener bk-opener--photo">
          <img src={pic.url} alt={title} />
          <div className="bk-opener__overlay">
            <span style={{ fontFamily: t.fonts.display }}>{label(t, `Chapter ${n}`)}</span>
            <h2 style={{ fontFamily: t.fonts.display, letterSpacing: t.headingTracking }}>{title}</h2>
          </div>
        </div>
      </Page>
    );

  if (t.opener === "band")
    return (
      <Page t={t}>
        <div className="bk-opener bk-opener--band">
          <div className="bk-opener__bar" style={{ background: t.palette.accent }} />
          <span style={{ color: t.palette.muted }}>{label(t, `Chapter ${n}`)}</span>
          <h2 style={{ fontFamily: t.fonts.display, letterSpacing: t.headingTracking }}>{title}</h2>
        </div>
      </Page>
    );

  if (t.opener === "folio")
    return (
      <Page t={t}>
        <div className="bk-opener bk-opener--folio">
          <span style={{ color: t.palette.muted, fontFamily: t.fonts.display }}>{roman}</span>
          <h2 style={{ fontFamily: t.fonts.display, letterSpacing: t.headingTracking }}>{title}</h2>
          <div className="bk-opener__hair" style={{ background: t.palette.rule }} />
        </div>
      </Page>
    );

  if (t.opener === "split" && pic?.url)
    return (
      <Page t={t} variant="plate">
        <div className="bk-opener bk-opener--split">
          <img src={pic.url} alt={title} />
          <div>
            <span style={{ color: t.palette.accent, fontFamily: t.fonts.display }}>{label(t, `Chapter ${n}`)}</span>
            <h2 style={{ fontFamily: t.fonts.display, letterSpacing: t.headingTracking }}>{title}</h2>
          </div>
        </div>
      </Page>
    );

  if (t.opener === "ornament")
    return (
      <Page t={t}>
        <div className="bk-opener bk-opener--ornament">
          <Divider t={t} />
          <span style={{ color: t.palette.muted, fontFamily: t.fonts.display }}>{label(t, `Chapter ${roman}`)}</span>
          <h2 style={{ fontFamily: t.fonts.display, letterSpacing: t.headingTracking }}>{title}</h2>
          <Divider t={t} />
        </div>
      </Page>
    );

  return (
    <Page t={t}>
      <div className="bk-opener bk-opener--numeral">
        <span className="bk-opener__numeral" style={{ fontFamily: t.fonts.display, color: t.palette.accent, opacity: 0.18 }}>
          {String(n).padStart(2, "0")}
        </span>
        <span style={{ color: t.palette.muted }}>{label(t, `Chapter ${n}`)}</span>
        <h2 style={{ fontFamily: t.fonts.display, letterSpacing: t.headingTracking }}>{title}</h2>
        <div className="bk-opener__hair" style={{ background: t.palette.rule }} />
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ book */

export function BookRender(props: Props) {
  const { themeId, custom, book, manuscript, chapters, photos, photosByCategory, topicToCategory } = props;
  const t = resolveDesign(getTemplate(themeId), custom);

  const withUrl = photos.filter((p) => p.url);
  const cover =
    (custom.coverPhotoId !== "auto" && withUrl.find((p) => p.id === custom.coverPhotoId)) ||
    withUrl[0] ||
    null;

  const allTimeline = chapters.flatMap((c) => (Array.isArray(c.timeline) ? c.timeline : []));
  const allQuotes = chapters.flatMap((c) =>
    (Array.isArray(c.quotes) ? c.quotes : []).filter((q: string) => q?.trim()),
  );
  const headTitle = book.name;
  let folio = 1;
  const next = () => folio++;

  const specialChapter = (keys: string[]) =>
    chapters.find((c) => keys.some((k) => String(c.topic).toLowerCase().includes(k)));

  const achievements = specialChapter(["achiev", "career", "job"]);
  const travel = specialChapter(["travel", "journey"]);
  const lessons = specialChapter(["advice", "lesson", "wisdom"]);

  return (
    <div className="bk-book">
      <Cover t={t} book={book} pic={cover} />

      {/* Inside cover / half title */}
      <Page t={t}>
        <div className="bk-center">

          <h2 className="bk-halftitle" style={{ fontFamily: t.fonts.display, letterSpacing: t.headingTracking }}>
            {book.name}
          </h2>
          <p style={{ color: t.palette.muted }}>
            {[book.relationship, book.country].filter(Boolean).join(" · ")}
          </p>
        </div>
      </Page>

      {/* Dedication */}
      <Page t={t}>
        <div className="bk-center bk-dedication">
          <Kicker t={t}>Dedication</Kicker>
          <p style={{ fontFamily: t.fonts.script }}>
            {custom.dedication ||
              `For ${book.nickname || book.name}, and for everyone who will read these pages long after us.`}
          </p>
          <Divider t={t} />
        </div>
      </Page>

      {/* Family quote page */}
      <Page t={t}>
        <div className="bk-center">
          <Quote
            t={t}
            force="center"
            text={
              custom.familyQuote ||
              allQuotes[0] ||
              "A family is a story that never truly ends — it is only handed to the next pair of hands."
            }
            attribution={book.name}
          />
        </div>
      </Page>

      {/* Table of contents */}
      <Page flow t={t} header={custom.showHeader ? headTitle : undefined} footer={custom.showFooter ? "" : undefined} folio={custom.showFooter ? next() : undefined}>
        <Measure t={t}>
          <Kicker t={t}>Contents</Kicker>
          <h2 className="bk-h2" style={{ fontFamily: t.fonts.display, letterSpacing: t.headingTracking }}>
            Table of Contents
          </h2>
          <ol className="bk-toc">
            {manuscript?.introduction && (
              <li style={{ borderColor: t.palette.rule }}>
                <span>Introduction</span>
                <span style={{ color: t.palette.muted }}>i</span>
              </li>
            )}
            {chapters.map((c, i) => (
              <li key={c.id} style={{ borderColor: t.palette.rule }}>
                <span>
                  <em style={{ color: t.palette.accent, fontFamily: t.fonts.display }}>
                    {String(i + 1).padStart(2, "0")}
                  </em>{" "}
                  {c.title || c.topic}
                </span>
                <span style={{ color: t.palette.muted }}>{i + 1}</span>
              </li>
            ))}
            <li style={{ borderColor: t.palette.rule }}>
              <span>Important Dates</span>
              <span style={{ color: t.palette.muted }}>—</span>
            </li>
            <li style={{ borderColor: t.palette.rule }}>
              <span>A Letter to the Family</span>
              <span style={{ color: t.palette.muted }}>—</span>
            </li>
          </ol>
        </Measure>
      </Page>

      {/* Introduction */}
      {manuscript?.introduction && (
        <Page flow t={t} header={custom.showHeader ? headTitle : undefined} footer={custom.showFooter ? "Introduction" : undefined} folio={custom.showFooter ? next() : undefined}>
          <Measure t={t}>
            <Kicker t={t}>Introduction</Kicker>
            <h2 className="bk-h2" style={{ fontFamily: t.fonts.display, letterSpacing: t.headingTracking }}>
              Before we begin
            </h2>
            <Narrative t={t} text={manuscript.introduction} dropCap />
            <Divider t={t} />
          </Measure>
        </Page>
      )}

      {/* Chapters */}
      {chapters.map((ch, i) => {
        const cat = topicToCategory[String(ch.topic).toLowerCase()];
        const pics = cat ? (photosByCategory[cat] ?? []).filter((p) => p.url) : [];
        const quotes = (Array.isArray(ch.quotes) ? ch.quotes : []).filter((q: string) => q?.trim());
        const tl = Array.isArray(ch.timeline) ? ch.timeline : [];
        const title = ch.title || ch.topic;

        return (
          <div key={ch.id}>
            <ChapterOpener t={t} ch={ch} pic={pics[0] ?? null} n={i + 1} />

            <Page
              flow
              t={t}
              header={custom.showHeader ? title : undefined}
              footer={custom.showFooter ? headTitle : undefined}
              folio={custom.showFooter ? next() : undefined}
            >
              <Measure t={t}>
                {ch.narrative && <Narrative t={t} text={ch.narrative} dropCap />}
                {quotes[0] && <Quote t={t} text={quotes[0]} attribution={book.name} />}
              </Measure>

              {pics.length > 0 && (
                <div className="bk-wide">
                  <PhotoBlock t={t} pics={pics.slice(0, 5)} />
                </div>
              )}

              {tl.length > 0 && (
                <Measure t={t}>
                  <div className="bk-section">
                    <Kicker t={t}>Timeline</Kicker>
                    <Timeline t={t} items={tl} />
                  </div>
                </Measure>
              )}

              {quotes[1] && (
                <Measure t={t}>
                  <Quote t={t} force="center" text={quotes[1]} attribution={`Closing — ${title}`} />
                </Measure>
              )}
              <Divider t={t} />
            </Page>

            {/* Full-bleed plate between chapters when the template is photo-led */}
            {pics[1] && (t.photo === "full" || t.photo === "borderless") && (
              <Page t={t} variant="plate">
                <FullBleedPlate t={t} pic={pics[1]} caption={`${title} — ${book.name}`} />
              </Page>
            )}
          </div>
        );
      })}

      {/* Important dates */}
      {allTimeline.length > 0 && (
        <Page flow t={t} header={custom.showHeader ? headTitle : undefined} footer={custom.showFooter ? "Important Dates" : undefined} folio={custom.showFooter ? next() : undefined}>
          <Measure t={t}>
            <Kicker t={t}>Special Page</Kicker>
            <h2 className="bk-h2" style={{ fontFamily: t.fonts.display }}>Important Dates</h2>
          </Measure>
          <div className="bk-wide">
            <Timeline t={t} items={allTimeline} />
          </div>
        </Page>
      )}

      {/* Family tree */}
      <Page flow t={t} header={custom.showHeader ? headTitle : undefined} footer={custom.showFooter ? "Family Tree" : undefined} folio={custom.showFooter ? next() : undefined}>
        <Measure t={t}>
          <Kicker t={t}>Special Page</Kicker>
          <h2 className="bk-h2" style={{ fontFamily: t.fonts.display }}>Family Tree</h2>
        </Measure>
        <div className="bk-tree">
          <div className="bk-tree__node" style={{ borderColor: t.palette.rule, fontFamily: t.fonts.display }}>
            {book.name}
            <small style={{ color: t.palette.muted }}>{book.relationship || "Family"}</small>
          </div>
          <span className="bk-tree__stem" style={{ background: t.palette.rule }} />
          <div className="bk-tree__row">
            {["Parents", "Siblings", "Children"].map((r) => (
              <div key={r} className="bk-tree__node is-soft" style={{ borderColor: t.palette.rule }}>
                {r}
                <small style={{ color: t.palette.muted }}>to be completed</small>
              </div>
            ))}
          </div>
        </div>
      </Page>

      {/* Life lessons + favourite quotes */}
      {(lessons || allQuotes.length > 0) && (
        <Page flow t={t} header={custom.showHeader ? headTitle : undefined} footer={custom.showFooter ? "Life Lessons" : undefined} folio={custom.showFooter ? next() : undefined}>
          <Measure t={t}>
            <Kicker t={t}>Special Page</Kicker>
            <h2 className="bk-h2" style={{ fontFamily: t.fonts.display }}>Life Lessons & Favourite Quotes</h2>
            <div className="bk-cards">
              {allQuotes.slice(0, 6).map((q: string, i: number) => (
                <MemoryCard key={i} t={t} title={`No. ${i + 1}`}>
                  {q}
                </MemoryCard>
              ))}
            </div>
            {lessons?.narrative && <Narrative t={t} text={lessons.narrative.split(/\n\n+/).slice(0, 2).join("\n\n")} />}
          </Measure>
        </Page>
      )}

      {/* Achievements & travel */}
      {(achievements || travel) && (
        <Page flow t={t} header={custom.showHeader ? headTitle : undefined} footer={custom.showFooter ? "Achievements" : undefined} folio={custom.showFooter ? next() : undefined}>
          <Measure t={t}>
            <Kicker t={t}>Special Page</Kicker>
            <h2 className="bk-h2" style={{ fontFamily: t.fonts.display }}>Achievements & Journeys</h2>
            {achievements?.narrative && (
              <>
                <h3 className="bk-h3" style={{ fontFamily: t.fonts.display }}>Achievements</h3>
                <Narrative t={t} text={achievements.narrative.split(/\n\n+/).slice(0, 2).join("\n\n")} />
              </>
            )}
            {travel?.narrative && (
              <>
                <h3 className="bk-h3" style={{ fontFamily: t.fonts.display }}>Travel Memories</h3>
                <Narrative t={t} text={travel.narrative.split(/\n\n+/).slice(0, 2).join("\n\n")} />
              </>
            )}
          </Measure>
        </Page>
      )}

      {/* Photo collage / memories */}
      {withUrl.length > 2 && (
        <Page flow t={t} header={custom.showHeader ? headTitle : undefined} footer={custom.showFooter ? "Memories" : undefined} folio={custom.showFooter ? next() : undefined}>
          <Measure t={t}>
            <Kicker t={t}>Gallery</Kicker>
            <h2 className="bk-h2" style={{ fontFamily: t.fonts.display }}>Photo Memories</h2>
          </Measure>
          <div className="bk-wide">
            <PhotoBlock t={t} pics={withUrl.slice(0, 5)} />
          </div>
        </Page>
      )}

      {/* Ending letter */}
      {manuscript?.ending && (
        <Page flow t={t} header={custom.showHeader ? headTitle : undefined} footer={custom.showFooter ? "A Letter" : undefined} folio={custom.showFooter ? next() : undefined}>
          <Measure t={t}>
            <Kicker t={t}>Ending Letter</Kicker>
            <h2 className="bk-h2" style={{ fontFamily: t.fonts.display }}>A Letter to the Family</h2>
            <Narrative t={t} text={manuscript.ending} dropCap />
            <Divider t={t} />
          </Measure>
        </Page>
      )}

      {/* Thank you */}
      <Page t={t}>
        <div className="bk-center bk-dedication">
          <Kicker t={t}>Thank You</Kicker>
          <p style={{ fontFamily: t.fonts.script }}>
            {custom.thankYou ||
              `Thank you to everyone who remembered, corrected, laughed and cried while these pages were made.`}
          </p>
          <Divider t={t} />
        </div>
      </Page>

      {/* Back cover */}
      <section className="bk-page bk-page--cover">
        <div
          className="bk-backcover"
          style={{
            background: t.cover === "band" ? t.palette.deep : t.palette.paper,
            color: t.cover === "band" ? t.palette.coverInk : t.palette.ink,
          }}
        >
          <div className="bk-backcover__inner" style={{ borderColor: t.palette.rule }}>
            <Kicker t={t}>{book.name}</Kicker>
            <p style={{ fontFamily: t.fonts.body }}>
              {(manuscript?.introduction || "").split(/\n\n+/)[0]?.slice(0, 320) ||
                `The life story of ${book.name}, gathered from memory and told in their own words.`}
            </p>
            {cover?.url && (
              <div className="bk-backcover__author">
                <img src={cover.url} alt={book.name} />
                <span style={{ color: t.palette.muted }}>{book.name}</span>
              </div>
            )}
            <div className="bk-backcover__foot">
              <span className="bk-qr" style={{ borderColor: t.palette.rule, color: t.palette.muted }}>
                QR
              </span>
              <span style={{ color: t.palette.muted }}>My Family History Book</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
