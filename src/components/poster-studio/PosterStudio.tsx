"use client";

import Image from "next/image";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  POSTER_LIMITS,
  type PosterRequest,
  type PosterStyle,
  type PosterSuccess,
} from "@/types/poster";
import { downloadPoster, generatePoster } from "./api";
import { PosterRequestError } from "./errors";
import { STYLE_OPTIONS } from "./styles";
import css from "./PosterStudio.module.css";

type Result = { poster: PosterSuccess; title: string; style: PosterStyle };
type Status = "idle" | "loading" | "success" | "error";
const SAMPLE = {
  title: "Builders After Dark",
  dateTimeText: "Friday, 7 PM",
  venue: "Toronto",
  description: "An evening for indie hackers to meet and share ideas.",
};
const EMPTY = { title: "", dateTimeText: "", venue: "", description: "" };

function Arrow({ download = false }: { download?: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {download ? (
        <>
          <path d="M12 3v12m-5-5 5 5 5-5" />
          <path d="M4 16v5h16v-5" />
        </>
      ) : (
        <path d="M4 12h16m-6-6 6 6-6 6" />
      )}
    </svg>
  );
}

function StyleArtwork({
  style,
  thumbnail = false,
}: {
  style: PosterStyle;
  thumbnail?: boolean;
}) {
  if (style === "minimal") {
    return (
      <span
        className={css.typeStudy}
        data-thumbnail={thumbnail}
        aria-hidden="true"
      >
        <span className={css.studyTitle}>
          Builders
          <br />
          After
          <br />
          Dark.
        </span>
        <span className={css.studyDetails}>
          Friday, 7 PM
          <br />
          Toronto
        </span>
      </span>
    );
  }
  return (
    <Image
      src={`/posters/${style}-example.png`}
      alt=""
      width={832}
      height={1248}
      sizes={thumbnail ? "128px" : "(max-width: 600px) 82vw, 400px"}
      className={css.sampleImage}
      preload={!thumbnail && style === "neon"}
    />
  );
}

export default function PosterStudio() {
  const [fields, setFields] = useState(EMPTY);
  const [style, setStyle] = useState<PosterStyle>("neon");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState("");
  const submitting = useRef(false);
  const previewRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const loading = status === "loading";
  const shownStyle = result?.style ?? style;
  const shownStyleName = STYLE_OPTIONS.find(
    (option) => option.id === shownStyle,
  )!.name;

  function update(field: keyof typeof fields, value: string) {
    setFields((previous) => ({ ...previous, [field]: value }));
  }

  function useExample() {
    setFields(SAMPLE);
    if (status === "error") {
      setStatus("idle");
      setError("");
    }
    titleRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const request: PosterRequest = {
      title: fields.title.trim(),
      dateTimeText: fields.dateTimeText.trim(),
      venue: fields.venue.trim(),
      description: fields.description.trim() || undefined,
      style,
    };
    if (!request.title || !request.dateTimeText || !request.venue) {
      setError(
        "Add an event name, date and time, and venue to create your poster.",
      );
      setStatus("error");
      return;
    }
    submitting.current = true;
    setStatus("loading");
    setError("");
    setDownloadMessage("");
    try {
      const poster = await generatePoster(request);
      setResult({ poster, title: request.title, style: request.style });
      setStatus("success");
      if (window.matchMedia("(max-width: 900px)").matches) {
        previewRef.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
          block: "start",
        });
      }
    } catch (cause) {
      setError(
        cause instanceof PosterRequestError
          ? cause.message
          : "We could not generate your poster. Please try again.",
      );
      setStatus("error");
    } finally {
      submitting.current = false;
    }
  }

  async function handleDownload() {
    if (!result || downloading) return;
    setDownloading(true);
    setDownloadMessage("");
    try {
      await downloadPoster(result.poster);
      setDownloadMessage("Download started. Check your browser’s downloads.");
    } catch {
      setDownloadMessage("The download did not start. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className={css.studio}>
      <a className={css.skipLink} href="#event-form">
        Skip to poster studio
      </a>
      <header className={css.masthead}>
        <div className={css.mastheadInner}>
          <span className={css.wordmark}>
            tonight<span>.</span>
          </span>
          <span className={css.brandDescription}>
            A good night deserves a great poster.
          </span>
          <span className={css.brandEnd}>Event poster studio</span>
        </div>
      </header>
      <div className={css.workspace}>
        <div className={css.intro}>
          <h1>
            Make something
            <br className={css.mobileBreak} /> worth showing up for.
          </h1>
          <p>Your event. Your style. A poster to put it out into the world.</p>
        </div>
        <div className={css.grid}>
          <form
            id="event-form"
            className={css.form}
            onSubmit={handleSubmit}
            aria-label="Create an event poster"
            aria-busy={loading}
          >
            <div className={css.sectionHead}>
              <h2>The occasion</h2>
              <button
                type="button"
                className={css.textButton}
                onClick={useExample}
                disabled={loading}
              >
                Try an example <Arrow />
              </button>
            </div>
            <fieldset className={css.details} disabled={loading}>
              <legend className={css.srOnly}>Event details</legend>
              <Field
                label="Event name"
                htmlFor="title"
                count={fields.title.length}
                max={POSTER_LIMITS.title}
              >
                <input
                  ref={titleRef}
                  id="title"
                  name="title"
                  required
                  maxLength={POSTER_LIMITS.title}
                  placeholder="What’s the occasion?"
                  value={fields.title}
                  onChange={(event) => update("title", event.target.value)}
                  autoComplete="off"
                />
              </Field>
              <div className={css.row}>
                <Field label="Date & time" htmlFor="dateTimeText">
                  <input
                    id="dateTimeText"
                    name="dateTimeText"
                    required
                    maxLength={POSTER_LIMITS.dateTimeText}
                    placeholder="Friday, 7 PM"
                    value={fields.dateTimeText}
                    onChange={(event) =>
                      update("dateTimeText", event.target.value)
                    }
                    autoComplete="off"
                  />
                </Field>
                <Field label="Venue" htmlFor="venue">
                  <input
                    id="venue"
                    name="venue"
                    required
                    maxLength={POSTER_LIMITS.venue}
                    placeholder="Where it’s happening"
                    value={fields.venue}
                    onChange={(event) => update("venue", event.target.value)}
                    autoComplete="off"
                  />
                </Field>
              </div>
              <Field
                label="A little more context"
                htmlFor="description"
                optional
                count={fields.description.length}
                max={POSTER_LIMITS.description}
              >
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  maxLength={POSTER_LIMITS.description}
                  placeholder="The crowd, the mood, what makes this one special…"
                  value={fields.description}
                  onChange={(event) =>
                    update("description", event.target.value)
                  }
                  aria-describedby="context-hint"
                />
              </Field>
              <p id="context-hint" className={css.fieldHint}>
                This guides the artwork. It isn’t intended as poster copy.
              </p>
            </fieldset>
            <fieldset className={css.styles} disabled={loading}>
              <legend>Set the mood</legend>
              <p className={css.sectionDescription}>
                Three directions. Make one your own.
              </p>
              <div className={css.styleGrid}>
                {STYLE_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className={css.styleOption}
                    data-selected={style === option.id}
                  >
                    <input
                      type="radio"
                      name="style"
                      value={option.id}
                      checked={style === option.id}
                      onChange={() => setStyle(option.id)}
                      className={css.srOnly}
                      aria-describedby={`style-${option.id}-hint`}
                    />
                    <span className={css.styleArt}>
                      <StyleArtwork style={option.id} thumbnail />
                    </span>
                    <span className={css.styleLabel}>
                      <span>{option.name}</span>
                      <span className={css.radioMark} aria-hidden="true" />
                    </span>
                    <span
                      id={`style-${option.id}-hint`}
                      className={css.styleHint}
                    >
                      {option.tagline}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className={css.submitArea}>
              {status === "error" && (
                <p className={css.error} role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className={css.primary} disabled={loading}>
                <span>
                  {loading
                    ? "Creating your poster…"
                    : result
                      ? "Generate another poster"
                      : "Generate poster"}
                </span>
                <Arrow />
              </button>
              <p className={css.generateHint}>
                One portrait poster, made with Ideogram.
              </p>
            </div>
          </form>
          <p className={css.srOnly} role="status">
            {loading
              ? "Generation in progress. This can take up to two minutes."
              : status === "success"
                ? "Your poster is ready to preview and download."
                : ""}
          </p>
          <section
            className={css.preview}
            ref={previewRef}
            aria-labelledby="preview-heading"
            aria-busy={loading}
          >
            <div className={css.previewHead}>
              <h2 id="preview-heading">
                {result ? "Your poster" : "Picture the possibilities"}
              </h2>
              <span className={css.previewStatus}>
                {loading
                  ? "Creating"
                  : result
                    ? "Ready to download"
                    : "Style reference"}
              </span>
            </div>
            <div className={css.gallery} data-loading={loading}>
              <div className={css.posterMount}>
                {result ? (
                  <img
                    className={css.poster}
                    src={result.poster.imageDataUrl}
                    alt={`Generated ${shownStyleName} poster for ${result.title}`}
                  />
                ) : (
                  <StyleArtwork style={style} />
                )}
              </div>
              {loading && (
                <div className={css.loadingPanel}>
                  <div className={css.loadingTrack} aria-hidden="true">
                    <span />
                  </div>
                  <p>Making room for a great night.</p>
                  <span>
                    Usually 10–20 seconds. Occasionally up to 2 minutes.
                  </span>
                </div>
              )}
            </div>
            <div className={css.caption}>
              <div>
                <p className={css.captionTitle}>
                  {result ? result.title : "Builders After Dark"}
                </p>
                <p>
                  {shownStyleName} <span aria-hidden="true">/</span> Portrait
                  2:3
                </p>
              </div>
              {result ? (
                <button
                  type="button"
                  className={css.download}
                  onClick={handleDownload}
                  disabled={loading || downloading}
                >
                  <Arrow download />
                  <span>{downloading ? "Preparing…" : "Download image"}</span>
                </button>
              ) : (
                <span className={css.sampleLabel}>
                  {style === "minimal" ? "Type study" : "Sample poster"}
                </span>
              )}
            </div>
            <p className={css.previewNote}>
              {result
                ? "Review the lettering before sharing. Your image stays here until you refresh."
                : "An example of the style. Your poster will be generated from your own event details."}
            </p>
            <p className={css.downloadMessage} role="status">
              {downloadMessage}
            </p>
          </section>
        </div>
        <footer className={css.footer}>
          <span>Made for the nights that bring us together.</span>
          <span>Tonight — AI Event Poster Studio</span>
        </footer>
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
  count?: number;
  max?: number;
  children: ReactNode;
}) {
  return (
    <div className={css.field}>
      <div className={css.fieldHead}>
        <label htmlFor={htmlFor}>
          {label}
          {optional && <span className={css.optional}>Optional</span>}
        </label>
        {count !== undefined && max !== undefined && (
          <span
            className={css.count}
            data-near={count > max * 0.9}
            aria-hidden="true"
          >
            {count}/{max}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
