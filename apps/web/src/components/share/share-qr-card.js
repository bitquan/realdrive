import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, Link as LinkIcon, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
async function copyText(value) {
    await navigator.clipboard.writeText(value);
}
export function ShareQrCard({ title, description, shareUrl, referralCode, fileName }) {
    const [pngUrl, setPngUrl] = useState("");
    useEffect(() => {
        let active = true;
        void QRCode.toDataURL(shareUrl, {
            margin: 1,
            width: 280,
            color: {
                dark: "#10231a",
                light: "#ffffff"
            }
        }).then((result) => {
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
                dark: "#10231a",
                light: "#ffffff"
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
    return (_jsxs(Card, { className: "overflow-hidden", children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(QrCode, { className: "h-5 w-5" }), title] }), _jsx(CardDescription, { children: description })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsx("div", { className: "flex justify-center rounded-[2rem] border border-brand-ink/10 bg-brand-sand/40 p-5", children: pngUrl ? (_jsx("img", { src: pngUrl, alt: `${title} QR code`, className: "h-56 w-56 rounded-2xl bg-white p-3 shadow-soft" })) : (_jsx("div", { className: "flex h-56 w-56 items-center justify-center rounded-2xl bg-white text-sm text-brand-ink/45", children: "Generating QR..." })) }), referralCode ? (_jsxs("div", { className: "rounded-3xl border border-brand-ink/10 bg-white p-4", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.22em] text-brand-ink/40", children: "Referral code" }), _jsx("p", { className: "mt-2 text-lg font-semibold", children: referralCode })] })) : null, _jsxs("div", { className: "rounded-3xl border border-brand-ink/10 bg-white p-4", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.22em] text-brand-ink/40", children: "Share link" }), _jsx("p", { className: "mt-2 break-all text-sm text-brand-ink/65", children: shareUrl })] }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs(Button, { type: "button", variant: "outline", onClick: () => void copyText(shareUrl), children: [_jsx(LinkIcon, { className: "mr-2 h-4 w-4" }), "Copy link"] }), referralCode ? (_jsxs(Button, { type: "button", variant: "outline", onClick: () => void copyText(referralCode), children: [_jsx(Copy, { className: "mr-2 h-4 w-4" }), "Copy code"] })) : (_jsxs(Button, { type: "button", variant: "outline", onClick: downloadPng, children: [_jsx(Download, { className: "mr-2 h-4 w-4" }), "Download PNG"] })), _jsxs(Button, { type: "button", onClick: downloadSvg, children: [_jsx(Download, { className: "mr-2 h-4 w-4" }), "Download SVG"] }), referralCode ? (_jsxs(Button, { type: "button", variant: "outline", onClick: downloadPng, children: [_jsx(Download, { className: "mr-2 h-4 w-4" }), "Download PNG"] })) : null] })] })] }));
}
