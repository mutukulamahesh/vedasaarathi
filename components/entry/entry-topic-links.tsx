// One compact line of ordinary, crawlable <a href> links to the public topic
// pages (lib/entry-pages.ts) in one language. Used in Home's footer and at the
// end of each entry page's topic text. No hooks and no client APIs, so it
// renders the same in the server topic text and in the client app.
//
// Plain document links on purpose: a full navigation re-renders the root
// layout, so <html lang> is right for the page it lands on.
/* eslint-disable @next/next/no-html-link-for-pages */

import {
  ENTRY_PAGE_TEXT, ENTRY_TOPICS, entryPath, htmlLang,
  type EntryLanguage, type EntryTopic,
} from "@/lib/entry-pages";

const LABEL: Readonly<Record<EntryLanguage, { nav: string; home: string }>> = {
  EN: { nav: "VedaSaarathi pages", home: "VedaSaarathi home" },
  TE: { nav: "వేదసారథి పేజీలు", home: "వేదసారథి హోమ్" },
};

export function EntryTopicLinks({
  language, exclude = null, includeHome = false,
}: {
  language: EntryLanguage;
  /** The current page's own topic, left out of the list. */
  exclude?: EntryTopic | null;
  /** Also link to "/" (used on the entry pages, not on Home itself). */
  includeHome?: boolean;
}) {
  const lang = htmlLang(language);
  return (
    <nav className="entry-topic-links" aria-label={LABEL[language].nav} lang={lang}>
      <ul>
        {ENTRY_TOPICS.filter((t) => t !== exclude).map((t) => (
          <li key={t}>
            <a href={entryPath(t, language)} hrefLang={lang}>{ENTRY_PAGE_TEXT[t][language].linkLabel}</a>
          </li>
        ))}
        {includeHome && <li><a href="/">{LABEL[language].home}</a></li>}
      </ul>
    </nav>
  );
}
