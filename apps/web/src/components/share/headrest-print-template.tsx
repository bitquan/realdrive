import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function toXmlSafe(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildTemplateSvg(shareUrl: string, qrDataUrl: string) {
  const safeUrl = toXmlSafe(shareUrl);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="816" height="1056" viewBox="0 0 816 1056">
  <rect width="816" height="1056" fill="#ffffff"/>
  <rect x="28" y="28" width="760" height="1000" rx="34" fill="#ffffff" stroke="#0f172a" stroke-width="6"/>
  <text x="408" y="112" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="800" fill="#0f172a">REALDRIVE</text>
  <text x="408" y="156" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="#0f172a">Scan to book your next ride</text>
  <text x="408" y="194" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#334155">Community-powered rides with real-time tracking</text>

  <rect x="188" y="232" width="440" height="440" rx="24" fill="#f8fafc" stroke="#0f172a" stroke-width="3"/>
  <image href="${qrDataUrl}" x="218" y="262" width="380" height="380"/>

  <text x="408" y="720" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#0f172a">Open with your camera and tap the link</text>

  <text x="84" y="778" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#0f172a">How to use</text>
  <text x="84" y="812" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#334155">1. Scan this QR code</text>
  <text x="84" y="840" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#334155">2. Enter pickup and dropoff</text>
  <text x="84" y="868" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#334155">3. Book and track your ride live</text>

  <text x="432" y="778" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#0f172a">Why choose us</text>
  <text x="432" y="812" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#334155">• Trusted local drivers</text>
  <text x="432" y="840" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#334155">• Transparent all-in pricing</text>
  <text x="432" y="868" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#334155">• Real-time trip updates</text>

  <text x="408" y="940" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#475569">${safeUrl}</text>
  <text x="408" y="972" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#0f172a">Keep this card and scan anytime for your next ride.</text>
</svg>`;
}

export function HeadrestPrintTemplate({
  shareUrl,
  fileName,
  title = "Headrest rider flyer"
}: {
  shareUrl: string;
  fileName: string;
  title?: string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    let active = true;

    void QRCode.toDataURL(shareUrl, {
      margin: 1,
      width: 560,
      color: {
        dark: "#0f172a",
        light: "#ffffff"
      }
    }).then((result: string) => {
      if (active) {
        setQrDataUrl(result);
      }
    });

    return () => {
      active = false;
    };
  }, [shareUrl]);

  const templateSvg = useMemo(() => {
    if (!qrDataUrl) {
      return "";
    }

    return buildTemplateSvg(shareUrl, qrDataUrl);
  }, [qrDataUrl, shareUrl]);

  function downloadTemplateSvg() {
    if (!templateSvg) {
      return;
    }

    const blob = new Blob([templateSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-4">
      <div className="rounded-5xl border border-ops-border-soft/95 bg-[linear-gradient(180deg,rgba(13,17,23,0.98),rgba(8,11,16,0.98))] p-5 shadow-panel md:p-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-ops-muted">Printable rider marketing</p>
            <h3 className="mt-2 text-xl font-bold text-ops-text">{title}</h3>
            <p className="mt-2 text-sm text-ops-muted">Centered QR layout for headrest placement with community and trust messaging.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void copyText(shareUrl)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy link
            </Button>
            <Button type="button" variant="outline" onClick={downloadTemplateSvg} disabled={!templateSvg}>
              <Download className="mr-2 h-4 w-4" />
              Download template
            </Button>
            <Button type="button" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </div>

      <article className="headrest-print-sheet mx-auto w-full max-w-[8.5in] rounded-[24px] border border-ops-border bg-white p-7 text-slate-900 shadow-elevated">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-slate-600">RealDrive</p>
          <h2 className="mt-2 text-[2rem] font-extrabold tracking-[-0.03em] text-slate-900">Scan to book your next ride</h2>
          <p className="mt-2 text-base text-slate-700">Community-powered rides with real-time tracking and transparent pricing.</p>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="rounded-[1.7rem] border-2 border-slate-900 bg-slate-50 p-5">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="RealDrive booking QR code" className="h-[3.1in] w-[3.1in] rounded-2xl bg-white p-3" />
            ) : (
              <div className="flex h-[3.1in] w-[3.1in] items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500">
                Generating QR...
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-slate-700">Open your camera, scan the code, and tap the booking link.</p>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-300 p-4">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">How to use</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>1. Scan this QR code</li>
              <li>2. Enter pickup and dropoff</li>
              <li>3. Book and track your ride live</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-slate-300 p-4">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">Why choose us</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>• Trusted local drivers</li>
              <li>• Transparent all-in pricing</li>
              <li>• Real-time trip updates</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3">
          <p className="truncate text-center text-[11px] text-slate-600 md:text-xs">{shareUrl}</p>
        </div>
      </article>
    </section>
  );
}
