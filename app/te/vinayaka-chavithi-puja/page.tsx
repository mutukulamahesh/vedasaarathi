// Public entry page /te/vinayaka-chavithi-puja (Telugu). See lib/entry-pages.ts.
import { EntryPage } from "@/components/entry/entry-page";
import { entryMetadata } from "@/lib/entry-metadata";

export const metadata = entryMetadata("vinayaka-chavithi-puja", "TE");

export default function Page() {
  return <EntryPage topic="vinayaka-chavithi-puja" language="TE" />;
}
