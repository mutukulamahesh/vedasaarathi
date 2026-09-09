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

export function OfflineDownload() {
  const [status, setStatus] = useState<OfflineStatus | null>(null);
  const [busy, setBusy] = useState<false | "download" | "remove">(false);
  const [progress, setProgress] = useState<OfflineProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    // Mount-time read is Cache-API only — never a network request on a page
    // that is just showing the puja. Only when a copy already exists do we go
    // to the network to check whether a newer build has shipped.
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
      if (res.failed.length > 0) {
        setError(
          `${res.failed.length} of ${res.total} files could not be saved, so the ` +
            `download is not complete. Try again on a stronger connection.`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
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
      <div className="offline-download">
        <p className="offline-download-note">
          This browser can’t store the puja for offline use. Everything still
          works while you’re online.
        </p>
      </div>
    );
  }

  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="offline-download">
      <div className="offline-download-head">
        <CloudDownload size={20} />
        <div>
          <strong>Use Vinayaka Puja offline</strong>
          <small>
            Saves the app and all {status?.expected ?? "…"} audio files on this
            device. No account, nothing sent anywhere.
          </small>
        </div>
      </div>

      {busy === "download" && (
        <div className="offline-download-progress" role="status" aria-live="polite">
          <div className="offline-download-bar"><span style={{ width: `${pct}%` }} /></div>
          <p>
            <Loader2 size={14} className="spin" /> Downloading {progress?.done ?? 0}
            {progress?.total ? ` of ${progress.total}` : ""} files… {pct}%
            {progress?.failed ? ` · ${progress.failed} retrying` : ""}
          </p>
        </div>
      )}

      {!busy && status?.downloaded && !status.updateAvailable && (
        <p className="offline-download-ok">
          <CheckCircle2 size={15} /> Downloaded · all {status.cached} files
          {status.bytes ? ` · ${formatMB(status.bytes)}` : ""}
          {status.at ? ` · ${new Date(status.at).toLocaleDateString()}` : ""}
        </p>
      )}

      {!busy && status?.updateAvailable && (
        <p className="offline-download-update" role="status">
          An update is available. The app has changed since you downloaded it —
          re-download to use the latest version offline.
        </p>
      )}

      {!busy && status && !status.downloaded && !status.updateAvailable && status.cached > 0 && (
        <p className="offline-download-partial">
          Not fully downloaded ({status.cached} / {status.expected} files) — re-download to finish.
        </p>
      )}

      {error && <p className="offline-download-error">{error}</p>}

      <div className="offline-download-actions">
        <button type="button" onClick={start} disabled={Boolean(busy)}>
          {status?.updateAvailable ? (
            <><RotateCw size={15} /> Update the download</>
          ) : status?.downloaded || (status?.cached ?? 0) > 0 ? (
            <><RotateCw size={15} /> Re-download</>
          ) : (
            <><CloudDownload size={15} /> Download for offline use</>
          )}
        </button>
        {(status?.cached ?? 0) > 0 && (
          <button type="button" className="offline-download-remove" onClick={remove} disabled={Boolean(busy)}>
            <Trash2 size={15} /> {busy === "remove" ? "Removing…" : "Remove downloaded copy"}
          </button>
        )}
      </div>
    </div>
  );
}
