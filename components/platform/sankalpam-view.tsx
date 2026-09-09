"use client";

// Renders an assembled Sankalpam draft: the Telugu script and the
// transliteration, clause by clause, with user-entered values («…») visibly
// marked. Shared by the pre-puja Sankalpam setup screen and the Sankalpam step
// in the guided puja. Both languages are always shown — item 1 requires the
// family to see the actual final Telugu AND transliteration.
//
// The transliteration sub-block carries data-allow-latin so the Telugu-only
// check treats it like the romanised mantra reading; user-value spans are
// marked the same way.

import type { GeneratedSankalpam, SankalpamSegment } from "@/lib/sankalpam";

function Line({ segments, side }: { segments: SankalpamSegment[]; side: "te" | "roman" }) {
  return (
    <p className="sankalpam-assembled-line" lang={side === "te" ? "te" : undefined}>
      {segments.map((s, i) => {
        const text = side === "te" ? s.te : s.roman;
        return (
          <span
            key={i}
            className={`sk-seg sk-${s.kind.toLowerCase()}${s.userEntered ? " sk-user" : ""}`}
            {...(s.userEntered ? { "data-allow-latin": "sankalpam-user-value" } : {})}
          >
            {text}{" "}
          </span>
        );
      })}
    </p>
  );
}

export function SankalpamAssembledView({
  gen,
  compact = false,
  language = "EN",
}: {
  gen: GeneratedSankalpam;
  /** compact hides the user-value legend + notes (used inline on the step). */
  compact?: boolean;
  language?: "EN" | "TE";
}) {
  const te = language === "TE";
  return (
    <div className="sankalpam-assembled">
      <p className="sankalpam-assembled-status" lang={te ? "te" : undefined}>
        {te
          ? `సంకల్ప ముసాయిదా · ${gen.calendarForm === "FULL_DATED" ? "పూర్తి తిథి రూపం" : "సంక్షిప్త రూపం"} · పురోహిత ఆమోదం లేదు.`
          : `Draft Sankalpam · ${gen.calendarForm === "FULL_DATED" ? "full dated form" : "short form"}` +
            `${gen.calendarFallbackReason ? " (dated form not possible — see note)" : ""} · not priest-approved.`}
      </p>

      <h5 lang={te ? "te" : undefined}>{te ? "తెలుగు పాఠం" : "Telugu"}</h5>
      <Line segments={gen.segments} side="te" />

      <h5 lang={te ? "te" : undefined}>{te ? "ఉచ్చారణ" : "Transliteration"}</h5>
      {/* Flat element so the Telugu-only check strips it whole. */}
      <pre className="sankalpam-assembled-roman" data-allow-latin="transliteration">
        {gen.transliteration}
      </pre>

      {!compact && gen.userValues.length > 0 && (
        <div className="sankalpam-uservalues" data-allow-latin="sankalpam-user-value">
          <p><strong>Values you entered</strong> (shown between « » in the text above):</p>
          <ul>
            {gen.userValues.map((v) => (
              <li key={`${v.label}=${v.value}`}>
                {v.label}: «{v.value}»
              </li>
            ))}
          </ul>
        </div>
      )}

      {!compact && gen.calendarFallbackReason && (
        <p className="sankalpam-note-line">{gen.calendarFallbackReason}</p>
      )}

      {!compact && gen.pendingChoices.length > 0 && (
        <div className="sankalpam-pending">
          <strong>Still to decide before the puja:</strong>
          <ul>{gen.pendingChoices.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
