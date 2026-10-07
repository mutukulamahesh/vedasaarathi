// Public entry page /bathukamma-2026 (English). See lib/entry-pages.ts.
import { EntryPage } from "@/components/entry/entry-page";
import { entryMetadata } from "@/lib/entry-metadata";

export const metadata = entryMetadata("bathukamma-2026", "EN");

export default function Page() {
  return <EntryPage topic="bathukamma-2026" language="EN" />;
}
