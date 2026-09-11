"use client";

// "Download Vinayaka Puja for offline use" (item 5). Caches the app shell,
// JS/CSS and every bundled audio file into the offline cache, with a progress
// bar, a verified "downloaded" state, and remove / re-download controls.

import { CheckCircle2, CloudDownload, Loader2, RotateCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  downloadForOffline, offlineStatus, removeOffline, formatMB,
  type OfflineProgress, type OfflineStatus,
} from "@/lib/offline/download";

const L = {
  EN: {
    unsupported: "This browser can’t store the puja for offline use. Everything still works while you’re online.",
    title: "Use Vinayaka Puja offline",
    // `n` is the TOTAL offline file count (app shell + JS/CSS + every bundled
    // audio file) — not an audio-only count — so the copy must not call it
    // "audio files".
    sub: (n: string) => `Saves the app on this device — ${n} files, including every audio clip. No account, nothing sent anywhere.`,
    downloading: (d: number, t: string, pct: number, retry: string) => `Downloading ${d}${t} files… ${pct}%${retry}`,
    ofN: (t: number) => ` of ${t}`,
    retrying: (n: number) => ` · ${n} retrying`,
    done: (n: number, size: string, date: string) => `Downloaded · all ${n} files${size}${date}`,
    updateAvail: "An update is available. The app has changed since you downloaded it — re-download to use the latest version offline.",
    partial: (c: number, e: number) => `Not fully downloaded (${c} / ${e} files) — re-download to finish.`,
    failed: (f: number, t: number) => `${f} of ${t} files could not be saved, so the download is not complete. Try again on a stronger connection.`,
    genericFail: "Download failed.",
    update: "Update the download",
    redownload: "Re-download",
    download: "Download for offline use",
    remove: "Remove downloaded copy",
    removing: "Removing…",
  },
  TE: {
    unsupported: "ఈ బ్రౌజర్ పూజను ఆఫ్‌లైన్ కోసం నిల్వ చేయలేదు. ఆన్‌లైన్‌లో ఉన్నప్పుడు అంతా పని చేస్తుంది.",
    title: "వినాయక పూజను ఆఫ్‌లైన్‌లో వాడండి",
    sub: (n: string) => `యాప్‌ను ఈ పరికరంలో సేవ్ చేస్తుంది — ${n} ఫైళ్ళు, ప్రతి ఆడియో క్లిప్‌తో సహా. ఖాతా అవసరం లేదు, ఎక్కడికీ ఏమీ పంపబడదు.`,
    downloading: (d: number, t: string, pct: number, retry: string) => `${d}${t} ఫైళ్ళు డౌన్‌లోడ్ అవుతున్నాయి… ${pct}%${retry}`,
    ofN: (t: number) => ` / ${t}`,
    retrying: (n: number) => ` · ${n} మళ్ళీ ప్రయత్నిస్తోంది`,
    done: (n: number, size: string, date: string) => `డౌన్‌లోడ్ అయింది · అన్ని ${n} ఫైళ్ళు${size}${date}`,
    updateAvail: "ఒక అప్‌డేట్ అందుబాటులో ఉంది. మీరు డౌన్‌లోడ్ చేసినప్పటి నుండి యాప్ మారింది — తాజా వెర్షన్ ఆఫ్‌లైన్‌లో వాడటానికి మళ్ళీ డౌన్‌లోడ్ చేయండి.",
    partial: (c: number, e: number) => `పూర్తిగా డౌన్‌లోడ్ కాలేదు (${c} / ${e} ఫైళ్ళు) — పూర్తి చేయడానికి మళ్ళీ డౌన్‌లోడ్ చేయండి.`,
    failed: (f: number, t: number) => `${t} లో ${f} ఫైళ్ళు సేవ్ చేయలేకపోయాం, డౌన్‌లోడ్ పూర్తి కాలేదు. మంచి కనెక్షన్‌తో మళ్ళీ ప్రయత్నించండి.`,
    genericFail: "డౌన్‌లోడ్ విఫలమైంది.",
    update: "డౌన్‌లోడ్‌ను అప్‌డేట్ చేయండి",
    redownload: "మళ్ళీ డౌన్‌లోడ్ చేయండి",
    download: "ఆఫ్‌లైన్ కోసం డౌన్‌లోడ్ చేయండి",
    remove: "డౌన్‌లోడ్ చేసిన కాపీని తీసివేయండి",
    removing: "తీసివేస్తోంది…",
  },
} as const;

export function OfflineDownload({ language = "EN" }: { language?: "EN" | "TE" }) {
  const t = language === "TE" ? L.TE : L.EN;
  const [status, setStatus] = useState<OfflineStatus | null>(null);
  const [busy, setBusy] = useState<false | "download" | "remove">(false);
  const [progress, setProgress] = useState<OfflineProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    offlineStatus()
      .then((s) => {
        setStatus(s);
        if (s.downloaded || s.cached > 0) {
          offlineStatus({ checkForUpdate: true }).then(setStatus).catch(() => {});
        }
      })
      .catch(() => setStatus(null));
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const start = async () => {
    setError(null);
    setBusy("download");
    setProgress({ done: 0, total: 0, failed: 0, currentUrl: "" });
    try {
      const res = await downloadForOffline((p) => setProgress(p));
      if (res.failed.length > 0) setError(t.failed(res.failed.length, res.total));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericFail);
    } finally {
      setBusy(false);
      setProgress(null);
      refresh();
    }
  };

  const remove = async () => {
    setBusy("remove");
    try {
      await removeOffline();
    } finally {
      setBusy(false);
      refresh();
    }
  };

  if (status && !status.supported) {
    return (
      <div className="offline-download" lang={language === "TE" ? "te" : undefined}>
        <p className="offline-download-note">{t.unsupported}</p>
      </div>
    );
  }

  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="offline-download" lang={language === "TE" ? "te" : undefined}>
      <div className="offline-download-head">
        <CloudDownload size={20} />
        <div>
          <strong>{t.title}</strong>
          <small>{t.sub(String(status?.expected ?? "…"))}</small>
        </div>
      </div>

      {busy === "download" && (
        <div className="offline-download-progress" role="status" aria-live="polite">
          <div className="offline-download-bar"><span style={{ width: `${pct}%` }} /></div>
          <p>
            <Loader2 size={14} className="spin" />{" "}
            {t.downloading(
              progress?.done ?? 0,
              progress?.total ? t.ofN(progress.total) : "",
              pct,
              progress?.failed ? t.retrying(progress.failed) : "",
            )}
          </p>
        </div>
      )}

      {!busy && status?.downloaded && !status.updateAvailable && (
        <p className="offline-download-ok">
          <CheckCircle2 size={15} />{" "}
          {t.done(
            status.cached,
            status.bytes ? ` · ${formatMB(status.bytes)}` : "",
            status.at ? ` · ${new Date(status.at).toLocaleDateString()}` : "",
          )}
        </p>
      )}

      {!busy && status?.updateAvailable && (
        <p className="offline-download-update" role="status">{t.updateAvail}</p>
      )}

      {!busy && status && !status.downloaded && !status.updateAvailable && status.cached > 0 && (
        <p className="offline-download-partial">{t.partial(status.cached, status.expected)}</p>
      )}

      {error && <p className="offline-download-error">{error}</p>}

      <div className="offline-download-actions">
        <button type="button" onClick={start} disabled={Boolean(busy)}>
          {status?.updateAvailable ? (
            <><RotateCw size={15} /> {t.update}</>
          ) : status?.downloaded || (status?.cached ?? 0) > 0 ? (
            <><RotateCw size={15} /> {t.redownload}</>
          ) : (
            <><CloudDownload size={15} /> {t.download}</>
          )}
        </button>
        {(status?.cached ?? 0) > 0 && (
          <button type="button" className="offline-download-remove" onClick={remove} disabled={Boolean(busy)}>
            <Trash2 size={15} /> {busy === "remove" ? t.removing : t.remove}
          </button>
        )}
      </div>
    </div>
  );
}
