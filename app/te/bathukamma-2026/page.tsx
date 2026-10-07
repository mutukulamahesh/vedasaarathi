// Public entry page /te/bathukamma-2026 (Telugu). See lib/entry-pages.ts.
import { EntryPage } from "@/components/entry/entry-page";
import { entryMetadata } from "@/lib/entry-metadata";

export const metadata = entryMetadata("bathukamma-2026", "TE");

export default function Page() {
  return <EntryPage topic="bathukamma-2026" language="TE" />;
}
