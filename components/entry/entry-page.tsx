// One public entry page (lib/entry-pages.ts): the real app, opened on the
// topic's existing screen, with that topic's server-rendered text. A server
// component - the topic text is in the initial HTML; the app itself is the
// same client component "/" renders.
import { VedaSaarathiApp } from "@/app/page";
import type { EntryLanguage, EntryTopic } from "@/lib/entry-pages";

import { EntryTopicContent } from "./entry-topic-content";

export function EntryPage({ topic, language }: { topic: EntryTopic; language: EntryLanguage }) {
  return (
    <VedaSaarathiApp
      entry={{ topic, language }}
      entryContent={<EntryTopicContent topic={topic} language={language} />}
    />
  );
}
