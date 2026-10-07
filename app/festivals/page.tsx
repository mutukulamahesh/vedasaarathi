// Public entry page /festivals (English). See lib/entry-pages.ts.
import { EntryPage } from "@/components/entry/entry-page";
import { entryMetadata } from "@/lib/entry-metadata";

export const metadata = entryMetadata("festivals", "EN");

export default function Page() {
  return <EntryPage topic="festivals" language="EN" />;
}
