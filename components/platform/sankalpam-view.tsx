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

  // Unrelated GROUP + "each recites individually": one complete Sankalpam per
  // person, each with THAT person's own name and lineage. Never a single text
  // with <name>/<gotra> placeholders, never the first person's Gotra applied to
  // everyone. (blocker 3)
  if (gen.memberResults && gen.memberResults.length > 0) {
    return (
      <div className="sankalpam-assembled sankalpam-assembled-group">
        <p className="sankalpam-assembled-status" lang={te ? "te" : undefined}>
          {te
            ? "గుంపు సంకల్పం · ప్రతి ఒక్కరూ తమ సొంత పేరు, గోత్రంతో విడిగా చెబుతారు."
            : "Group Sankalpam · each person recites their own, with their own name and lineage."}
        </p>
        {gen.memberResults.map((m, i) => (
          <section key={i} className="sankalpam-member">
            <h5 lang={te ? "te" : undefined}>
              {(m.userValues.find((v) => /name/i.test(v.label))?.value || "").trim() ||
                (te ? `వ్యక్తి ${i + 1}` : `Person ${i + 1}`)}
            </h5>
            <SankalpamAssembledView gen={m} compact={compact} language={language} />
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="sankalpam-assembled">
      <p className="sankalpam-assembled-status" lang={te ? "te" : undefined}>
        {te
          ? `మీ సంకల్పం · ${gen.calendarForm === "FULL_DATED" ? "పూర్తి తిథి రూపం" : "సంక్షిప్త రూపం"}.`
          : `Your Sankalpam · ${gen.calendarForm === "FULL_DATED" ? "full dated form" : "short form"}` +
            `${gen.calendarFallbackReason ? " (dated form not possible — see note)" : ""}.`}
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

      {/* Collective group: state plainly which lineage, if any, is spoken. */}
      {gen.collectiveLineageNote && (
        <p className="sankalpam-note-line sankalpam-lineage-note">
          {gen.collectiveLineageNote}
        </p>
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
