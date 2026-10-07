// Public entry page /panchangam (English). See lib/entry-pages.ts.
import { EntryPage } from "@/components/entry/entry-page";
import { entryMetadata } from "@/lib/entry-metadata";

export const metadata = entryMetadata("panchangam", "EN");

export default function Page() {
  return <EntryPage topic="panchangam" language="EN" />;
}
