"use client";

import { useState, type FormEvent } from "react";
import { POSTER_LIMITS, type PosterRequest, type PosterStyle, type PosterSuccess } from "@/types/poster";
import { downloadPoster, generatePoster } from "./api";
import { PosterRequestError } from "./errors";
import { STYLE_OPTIONS } from "./styles";
import css from "./PosterStudio.module.css";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; poster: PosterSuccess }
  | { kind: "error"; message: string };

const SAMPLE: Omit<PosterRequest, "style"> = {
  title: "Builders After Dark",
  dateTimeText: "Friday, 7 PM",
  venue: "Toronto",
  description: "An evening for indie hackers to meet and share ideas.",
};

const EMPTY: Omit<PosterRequest, "style"> = { title: "", dateTimeText: "", venue: "", description: "" };

export default function PosterStudio() {
  const [fields, setFields] = useState(EMPTY);
  const [style, setStyle] = useState<PosterStyle>("neon");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // Keep the last good poster visible while regenerating or after an error.
  const [lastPoster, setLastPoster] = useState<PosterSuccess | null>(null);

  const loading = status.kind === "loading";

  function update(field: keyof typeof fields, value: string) {
    setFields((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const request: PosterRequest = {
      title: fields.title.trim(),
      dateTimeText: fields.dateTimeText.trim(),
      venue: fields.venue.trim(),
      description: fields.description?.trim() || undefined,
      style,
    };

    setStatus({ kind: "loading" });
    try {
      const poster = await generatePoster(request);
      setLastPoster(poster);
      setStatus({ kind: "success", poster });
    } catch (error) {
      const message =
        error instanceof PosterRequestError ? error.message : "Something went wrong. Please try again.";
      setStatus({ kind: "error", message });
    }
  }

  return (
    <div className={css.studio}>
      <header className={css.header}>
        <p className={css.logo}>
          Tonight<span aria-hidden="true">.</span>
        </p>
        <h1 className={css.headline}>Turn your event into a poster in seconds.</h1>
        <p className={css.subhead}>
          Describe the event, pick a vibe, and get a print-ready portrait poster generated with Ideogram.
        </p>
      </header>

      <div className={css.grid}>
        <form className={css.panel} onSubmit={handleSubmit}>
          <div className={css.panelHead}>
            <h2 className={css.panelTitle}>Event details</h2>
            <button type="button" className={css.linkButton} onClick={() => setFields(SAMPLE)} disabled={loading}>
              Try an example
            </button>
          </div>

          <Field label="Event name" htmlFor="title" count={fields.title.length} max={POSTER_LIMITS.title}>
            <input
              id="title"
              required
              maxLength={POSTER_LIMITS.title}
              placeholder="Builders After Dark"
              value={fields.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </Field>

          <div className={css.row}>
            <Field label="Date & time" htmlFor="dateTimeText" count={fields.dateTimeText.length} max={POSTER_LIMITS.dateTimeText}>
              <input
                id="dateTimeText"
                required
                maxLength={POSTER_LIMITS.dateTimeText}
                placeholder="Friday, 7 PM"
                value={fields.dateTimeText}
                onChange={(e) => update("dateTimeText", e.target.value)}
              />
            </Field>
            <Field label="Venue" htmlFor="venue" count={fields.venue.length} max={POSTER_LIMITS.venue}>
              <input
                id="venue"
                required
                maxLength={POSTER_LIMITS.venue}
                placeholder="Toronto"
                value={fields.venue}
                onChange={(e) => update("venue", e.target.value)}
              />
            </Field>
          </div>

          <Field
            label="Description"
            optional
            htmlFor="description"
            count={fields.description?.length ?? 0}
            max={POSTER_LIMITS.description}
          >
            <textarea
              id="description"
              rows={3}
              maxLength={POSTER_LIMITS.description}
              placeholder="An evening for indie hackers to meet and share ideas."
              value={fields.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </Field>

          <fieldset className={css.styles}>
            <legend className={css.label}>Visual style</legend>
            <div className={css.styleGrid}>
              {STYLE_OPTIONS.map((option) => (
                <label key={option.id} className={css.styleCard} data-selected={style === option.id}>
                  <input
                    type="radio"
                    name="style"
                    value={option.id}
                    checked={style === option.id}
                    onChange={() => setStyle(option.id)}
                    className={css.srOnly}
                  />
                  <span className={css.swatch} style={{ background: option.swatch }} aria-hidden="true" />
                  <span className={css.styleName}>{option.name}</span>
                  <span className={css.styleTagline}>{option.tagline}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <button type="submit" className={css.primary} disabled={loading}>
            {loading ? "Generating…" : lastPoster ? "Regenerate poster" : "Generate poster"}
          </button>
        </form>

        <section className={css.previewPanel} aria-live="polite" aria-busy={loading}>
          <div className={css.frame} data-loading={loading}>
            {lastPoster ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL, not optimizable
              <img src={lastPoster.imageDataUrl} alt={`Generated poster for ${fields.title || "your event"}`} className={css.poster} />
            ) : (
              <div className={css.placeholder}>
                <span className={css.placeholderIcon} aria-hidden="true">✦</span>
                <p>Your poster will appear here.</p>
              </div>
            )}
            {loading && (
              <div className={css.overlay}>
                <span className={css.spinner} aria-hidden="true" />
                <p>Designing your poster…</p>
                <p className={css.overlayHint}>This usually takes 10–20 seconds.</p>
              </div>
            )}
          </div>

          {status.kind === "error" && (
            <p className={css.error} role="alert">
              {status.message}
            </p>
          )}

          {lastPoster && (
            <div className={css.actions}>
              <button type="button" className={css.secondary} onClick={() => downloadPoster(lastPoster)} disabled={loading}>
                Download
              </button>
              <p className={css.note}>AI-generated lettering can contain mistakes — review before sharing.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  optional,
  count,
  max,
  children,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  count: number;
  max: number;
  children: React.ReactNode;
}) {
  return (
    <div className={css.field}>
      <div className={css.fieldHead}>
        <label htmlFor={htmlFor} className={css.label}>
          {label}
          {optional && <span className={css.optional}> (optional)</span>}
        </label>
        <span className={css.count} data-near={count > max * 0.9}>
          {count}/{max}
        </span>
      </div>
      {children}
    </div>
  );
}
