---
name: Tonight
description: An exhibition studio for event posters, with mineral surfaces and restrained controls.
colors:
  bg: "#f3f5f3"
  surface: "#ffffff"
  gallery: "#e2e9e5"
  text: "#183c36"
  text-muted: "#566760"
  border: "#bdcbc4"
  control-border: "#7c9184"
  accent: "#20564b"
  accent-hover: "#153e35"
  accent-soft: "#d9e9e1"
  danger: "#9d2d25"
  danger-bg: "#fff0ec"
  focus: "#956513"
  brand-dot: "#c8dbb6"
  brand-caption: "#d2ded8"
  placeholder: "#69776f"
  accent-active: "#0d3028"
  accent-disabled: "#49695f"
typography:
  display:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 650
    lineHeight: 1.16
    letterSpacing: "-0.035em"
  wordmark:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 650
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
  action:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
  secondary-action:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
  annotation:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
rounded:
  thumbnail: "4px"
  control: "6px"
  gallery: "8px"
spacing:
  detail: "4px"
  icon: "8px"
  compact: "12px"
  row: "16px"
  field: "18px"
  section-head: "20px"
  inset: "24px"
  subsection: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "14px 18px"
    width: "100%"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-primary-active:
    backgroundColor: "{colors.accent-active}"
  button-primary-disabled:
    backgroundColor: "{colors.accent-disabled}"
  button-download:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.secondary-action}"
    rounded: "{rounded.control}"
    padding: "11px 14px"
  button-download-hover:
    backgroundColor: "{colors.accent-soft}"
  button-text:
    textColor: "{colors.text}"
    typography: "{typography.secondary-action}"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
    width: "100%"
  gallery:
    backgroundColor: "{colors.gallery}"
    rounded: "{rounded.gallery}"
    padding: "30px 44px"
  error:
    backgroundColor: "{colors.danger-bg}"
    textColor: "{colors.danger}"
    rounded: "{rounded.control}"
    padding: "14px"
---

# Design System: Tonight

## Overview

**Creative North Star: "The Exhibition Studio"**

Tonight gives colorful poster artwork room to lead inside a quiet, precise workspace. Cool mineral surfaces, deep teal text and actions, and compact grotesk typography make the controls feel familiar while the framed portrait provides the visual character.

This records implementation choices made within the authorized redesign. The palette and font are not exact choices prescribed by the user. Source evidence comes from `src/app/globals.css`, `src/app/layout.tsx`, and `src/components/poster-studio/PosterStudio.module.css` and `PosterStudio.tsx`. Rendered desktop and mobile verification remains outstanding because browser and native control were unavailable; these are extracted source rules, not screenshot-verified measurements.

**Key Characteristics:**

- Cool mineral ground with a deep teal brand bar and primary action.
- Hanken Grotesk throughout, with tight display tracking and readable form text.
- Flat controls and a softly elevated portrait mount.
- Clearly labeled artwork references and honest result, loading, and error states.

## Colors

The interface uses muted greens and cool near-whites so the poster supplies the strongest color variation. Frontmatter records canonical values; CSS custom properties remain the application source of truth. Sidecar tonal ramps are synthesized preview metadata, not additional implemented tokens.

### Primary

- **Deep Teal (`accent`):** primary generation button, selected radio treatment, field focus, and loading indicator. `accent-hover` and `accent-active` deepen interaction feedback; `accent-disabled` identifies the unavailable primary action.
- **Soft Mint (`accent-soft`):** download hover surface.

### Neutral

- **Mineral Ground (`bg`):** page background.
- **Paper White (`surface`):** fields, download control, loading panel, and poster backing.
- **Gallery Mist (`gallery`):** framed artwork surround and loading-track background.
- **Forest Ink (`text`):** primary text and masthead background.
- **Muted Sage Ink (`text-muted`):** supporting copy, captions, counters, and radio outlines.
- **Pale Sage Rule (`border`):** decorative dividers and the text-action underline.
- **Control Sage (`control-border`):** stronger input, textarea, and download-button boundaries.
- **Moss Dot (`brand-dot`)** and **Light Sage Caption (`brand-caption`):** small masthead accents.
- **Placeholder Sage (`placeholder`):** input hints, kept distinct from entered text.

Error text uses `danger` on `danger-bg`. Keyboard focus uses the ochre `focus` ring; focused text fields use the primary accent outline instead. Artwork colors are content, not interface palette tokens.

**The Artwork Color Rule.** Keep the surrounding workspace quiet so the poster can carry saturated color.

## Typography

**Display and Body Font:** Hanken Grotesk, loaded with `next/font/google`; fallback is `system-ui, sans-serif` through `--font-sans`.

The same family carries branding, instructions, and controls. Display text is compact and tightly tracked; form values remain full-size and sentence case. There is no separate mono family or fixed mathematical type scale.

The desktop heading uses `display`, section headings use `title`, and ordinary copy and field values use `body`. The wordmark has its own heavier role. Field labels use `label`; buttons use `action` or `secondary-action`; notes and counters use `annotation`. Counters use tabular numerals. Preview notes have a maximum measure of 60ch.

The CSS-only Minimal Editorial type study is sample content with larger, heavier lettering; its typography is not a general application heading style.

## Layout

The masthead and workspace share a centered maximum width of 1280px. Desktop horizontal padding is 48px; workspace top/bottom padding is 42px/24px. The editing and preview columns use `minmax(0, 0.85fr) minmax(0, 1.15fr)` with a 56px gap. This is fluid, not a fixed 400px form column. The preview sticks 24px from the viewport top.

Event fields use an 18px vertical gap. Date/time and venue share an equal two-column row with a 16px gap. Three style choices remain in equal columns. The artwork surround contains a centered 2:3 portrait mount, normally capped at 346px; the cap increases to 374px at viewport widths of at least 1500px. The gallery has a 400px minimum height on larger screens.

- **At 1100px and below:** horizontal page padding becomes 32px; column gap becomes 32px; columns become 1fr/1.1fr; gallery padding becomes 28px.
- **At 900px and below:** the workspace caps at 680px and stacks form before preview with a 40px gap. Preview becomes static; the brand description hides. The heading becomes 2rem, style thumbnails use a 1.2 aspect ratio, gallery padding becomes 32px, and portrait width caps at 360px. Successful generation scrolls the preview into view.
- **At 520px and below:** page padding becomes 20px horizontally, masthead minimum height becomes 72px, wordmark becomes 2rem, and the heading becomes 1.875rem with an explicit line break. Section headings become 1.0625rem. Date/time and venue stack, while all three style choices stay in one row with portrait-like 0.85 aspect ratios. Gallery padding becomes 24px and its minimum height is removed. Caption content wraps, download spans the available width, and footer items stack.

The body supports a minimum width of 320px. Source media queries describe intended adaptation; visual overflow and wrapping still require rendered verification.

## Elevation & Depth

Depth comes mainly from tonal layering: mineral page, mist gallery, white paper. Ordinary controls and sections have no shadow. Only the poster mount uses a soft shadow (`0 12px 24px -10px #183c3650`). The loading message sits over the dimmed artwork on a white panel.

**The Paper Lift Rule.** Reserve the existing soft elevation for the poster mount; controls remain flat.

Transitions are brief and functional: 160ms ease for fields, style outlines, and download backgrounds, and 180ms ease for the primary background. The indeterminate loading strip moves with a 1.6s ease-in-out alternate animation. Reduced-motion preference disables these transitions and animation, makes the strip full-width, and switches successful-generation scrolling to instant behavior.

## Shapes

Fields, buttons, alerts, and loading panels share restrained control rounding. Thumbnail corners are smaller; the gallery surround is slightly softer. The portrait itself stays square-cornered. Thin borders define form fields and secondary actions. The circular radio marks are the exception to the rectilinear vocabulary.

## Components

### Buttons

The full-width primary action has a minimum height of 54px, a left-aligned label and right-aligned inline SVG arrow. Hover and active backgrounds deepen. Disabled primary buttons use a muted fill. Download is a white bordered button with a minimum height of 44px; hover adds a mint surface and teal border. The text action has a minimum height of 44px and a subtle underline that strengthens on hover. Disabled secondary buttons use 0.5 opacity. Global keyboard focus is a 3px ochre outline offset by 4px.

### Inputs / Fields

White fields use a 1px `control-border` border and the shared control radius. Inputs have a minimum height of 48px. Textareas resize vertically between 96px and 280px. Hover darkens the border; focus uses a 2px teal outline offset by 1px. Labels remain visible above values. Optional labels and counters are smaller supporting text. Loading disables the detail and style fieldsets with 0.65 opacity. Errors appear as a separate warm-toned alert above the generation action.

### Style Choices

The three choices are native radio inputs with artwork labels, brief descriptions, and a small radio mark. A selected choice has an accent outline around its artwork and a thick teal radio ring. Hover changes the artwork outline to muted ink; keyboard focus outlines the complete choice in ochre. Selection remains apparent through the radio mark even while hovering. Neon and Retro use actual image samples; Minimal uses a CSS type study. These are choices, not generic card or chip components.

### Artwork Gallery

The framed portrait uses contained image fitting so the full output remains visible; thumbnail samples crop to fill. Before generation, captions explicitly identify a sample poster or type study. After success, the heading and caption identify the user's result and enable download. Regeneration dims the last image to 0.22 opacity underneath a loading panel. A failed request preserves the last successful result. The generated image and the download share the same result data.

### Masthead and Footer

The brand bar contains the wordmark, a supporting sentence, and a concise studio label. It is branding, not a navigation menu. A keyboard-revealed skip link jumps to the form. The footer uses a thin top divider and small muted text.

## Do's and Don'ts

### Do:

- **Do** keep the mineral workspace quiet around colorful artwork.
- **Do** use visible labels, native form controls, and distinct keyboard focus.
- **Do** distinguish sample artwork, type studies, generated results, and loading states.
- **Do** preserve the last successful artwork while reporting a generation error.
- **Do** honor reduced-motion preferences for loading and scroll behavior.

### Don't:

- **Don't** promote the artwork's colors or sample typography into application-wide tokens.
- **Don't** add shadows to every control or round the portrait mount into a card.
- **Don't** describe source-only responsive checks as rendered visual approval.
