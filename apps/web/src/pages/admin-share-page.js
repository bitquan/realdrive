import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Share2 } from "lucide-react";
import { ShareQrCard } from "@/components/share/share-qr-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
function publicOrigin() {
    return typeof window === "undefined" ? "" : window.location.origin;
}
export function AdminSharePage() {
    const baseUrl = publicOrigin();
    const riderUrl = `${baseUrl}/`;
    const driverUrl = `${baseUrl}/driver/signup`;
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("section", { className: "rounded-[2rem] border border-brand-ink/10 bg-white/90 p-6 shadow-soft md:p-8", children: [_jsxs("div", { className: "inline-flex items-center gap-2 rounded-full border border-brand-moss/20 bg-brand-mist px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-brand-ink/55", children: [_jsx(Share2, { className: "h-4 w-4" }), "Business QR kit"] }), _jsx("h1", { className: "mt-5 text-3xl font-extrabold tracking-tight md:text-4xl", children: "Stable launch QR codes for riders and drivers" }), _jsx("p", { className: "mt-3 max-w-2xl text-sm leading-6 text-brand-ink/60 md:text-base", children: "These business QR codes stay tied to the service itself. Personal rider and driver referral QR codes are handled separately inside their own surfaces." })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsx(ShareQrCard, { title: "Business rider QR", description: "Points to the public rider booking and email-capture landing page.", shareUrl: riderUrl, fileName: "realdrive-business-rider" }), _jsx(ShareQrCard, { title: "Business driver QR", description: "Points to the public driver signup page. Drivers still need admin approval before they can work.", shareUrl: driverUrl, fileName: "realdrive-business-driver" })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Launch notes" }), _jsx(CardDescription, { children: "Use the rider QR for rider growth and the driver QR when you are ready to recruit approved helpers." })] }), _jsxs(CardContent, { className: "space-y-2 text-sm text-brand-ink/60", children: [_jsx("p", { children: "The rider QR is the main acquisition asset for this pilot." }), _jsx("p", { children: "The driver QR creates a real pending driver account that still requires admin approval." }), _jsx("p", { children: "If your public base URL changes, regenerate or re-download these QR images from this page." })] })] })] }));
}
