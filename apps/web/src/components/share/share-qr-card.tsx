import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, Link as LinkIcon, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function ShareQrCard({
  title,
  description,
  shareUrl,
  referralCode,
  fileName
}: {
  title: string;
  description: string;
  shareUrl: string;
  referralCode?: string;
  fileName: string;
}) {
  const [pngUrl, setPngUrl] = useState("");

  useEffect(() => {
    let active = true;

    void QRCode.toDataURL(shareUrl, {
      margin: 1,
      width: 280,
      color: {
        dark: "#0f1623",
        light: "#f7fbff"
      }
    }).then((result: string) => {
      if (active) {
        setPngUrl(result);
      }
    });

    return () => {
      active = false;
    };
  }, [shareUrl]);

  async function downloadSvg() {
    const svg = await QRCode.toString(shareUrl, {
      type: "svg",
      margin: 1,
      width: 280,
      color: {
        dark: "#0f1623",
        light: "#f7fbff"
      }
    });
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadPng() {
    if (!pngUrl) {
      return;
    }

    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = `${fileName}.png`;
    link.click();
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center rounded-[2rem] border border-ops-border-soft bg-ops-panel p-5">
          {pngUrl ? (
            <img src={pngUrl} alt={`${title} QR code`} className="h-56 w-56 rounded-2xl bg-[#f7fbff] p-3 shadow-soft" />
          ) : (
            <div className="flex h-56 w-56 items-center justify-center rounded-2xl bg-ops-surface text-sm text-ops-muted">
              Generating QR...
            </div>
          )}
        </div>

        {referralCode ? (
          <div className="rounded-3xl border border-ops-border-soft bg-ops-surface p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-ops-muted">Referral code</p>
            <p className="mt-2 text-lg font-semibold text-ops-text">{referralCode}</p>
          </div>
        ) : null}

        <div className="rounded-3xl border border-ops-border-soft bg-ops-surface p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-ops-muted">Share link</p>
          <p className="mt-2 break-all text-sm text-ops-text/80">{shareUrl}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Button type="button" variant="outline" onClick={() => void copyText(shareUrl)}>
            <LinkIcon className="mr-2 h-4 w-4" />
            Copy link
          </Button>
          {referralCode ? (
            <Button type="button" variant="outline" onClick={() => void copyText(referralCode)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy code
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={downloadPng}>
              <Download className="mr-2 h-4 w-4" />
              Download PNG
            </Button>
          )}
          <Button type="button" onClick={downloadSvg}>
            <Download className="mr-2 h-4 w-4" />
            Download SVG
          </Button>
          {referralCode ? (
            <Button type="button" variant="outline" onClick={downloadPng}>
              <Download className="mr-2 h-4 w-4" />
              Download PNG
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
