// Public entry page /vinayaka-chavithi-puja (English). See lib/entry-pages.ts.
import { EntryPage } from "@/components/entry/entry-page";
import { entryMetadata } from "@/lib/entry-metadata";

export const metadata = entryMetadata("vinayaka-chavithi-puja", "EN");

export default function Page() {
  return <EntryPage topic="vinayaka-chavithi-puja" language="EN" />;
}
