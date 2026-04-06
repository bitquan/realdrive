import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BarChart3,
  BookOpen,
  CarFront,
  ClipboardList,
  CreditCard,
  Globe,
  KeyRound,
  LayoutDashboard,
  Lightbulb,
  Megaphone,
  MessageSquare,
  Map,
  QrCode,
  Route,
  Settings2,
  ShieldCheck,
  UserRound,
  Users
} from "lucide-react";
import { matchPath } from "react-router-dom";
import type { Role, SessionUser } from "@shared/contracts";
import { roleLabel, userHasRole } from "@/lib/utils";

export type ShellActionVariant = "primary" | "secondary" | "ghost";
export type ShellLayout = "standard" | "immersive";
export type ShellMapMode = "ambient" | "immersive" | "off";

export interface ShellAction {
  label: string;
  to: string;
  icon?: LucideIcon;
  variant?: ShellActionVariant;
}

export interface ShellNavItem {
  id: string;
  label: string;
  shortLabel?: string;
  to: string;
  icon: LucideIcon;
  matchPatterns: string[];
  searchParamKey?: string;
  searchParamValue?: string;
  activeWhenSearchMissing?: boolean;
  roles?: Role[];
  requiresAuth?: boolean;
  hidden?: (user: SessionUser | null) => boolean;
}

export interface ShellSection {
  id: string;
  label: string;
  items: ShellNavItem[];
}

export interface ShellFrame {
  title: string;
  eyebrow: string;
  description: string;
  layout?: ShellLayout;
  mapMode?: ShellMapMode;
  actions?: ShellAction[];
  mobileHeaderMode?: "compact" | "minimal";
}

const riderItems: ShellNavItem[] = [
  {
    id: "ride",
    label: "Ride",
    to: "/",
    icon: CarFront,
    matchPatterns: ["/", "/track/:token"]
  },
  {
    id: "my-rides",
    label: "My rides",
    shortLabel: "Rides",
    to: "/rider/rides",
    icon: UserRound,
    matchPatterns: ["/rider/rides", "/rider/rides/:rideId"],
    roles: ["rider"]
  },
  {
    id: "driver-signup",
    label: "Drive with us",
    shortLabel: "Drive",
    to: "/driver/signup",
    icon: Route,
    matchPatterns: ["/driver/signup", "/drive-with-us"],
    hidden: (user) => userHasRole(user, "driver")
  }
];

const sharedItems: ShellNavItem[] = [
  {
    id: "advertise",
    label: "Advertise",
    shortLabel: "Advertise",
    to: "/advertise",
    icon: Megaphone,
    matchPatterns: ["/advertise"]
  },
  {
    id: "community",
    label: "Community",
    to: "/community",
    icon: MessageSquare,
    matchPatterns: ["/community"],
    requiresAuth: true
  },
  {
    id: "roadmap",
    label: "Roadmap",
    shortLabel: "Roadmap",
    to: "/roadmap",
    icon: Map,
    matchPatterns: ["/roadmap"]
  },
  {
    id: "request-feature",
    label: "Request feature",
    shortLabel: "Feature",
    to: "/request-feature",
    icon: Lightbulb,
    matchPatterns: ["/request-feature"],
    requiresAuth: true
  },
  {
    id: "report-bug",
    label: "Report bug",
    shortLabel: "Bug",
    to: "/report-bug",
    icon: ClipboardList,
    matchPatterns: ["/report-bug"],
    requiresAuth: true
  },
  {
    id: "notifications",
    label: "Notifications",
    shortLabel: "Alerts",
    to: "/notifications",
    icon: Bell,
    matchPatterns: ["/notifications"],
    requiresAuth: true
  }
];

const driverItems: ShellNavItem[] = [
  {
    id: "driver-dashboard",
    label: "Home",
    shortLabel: "Home",
    to: "/driver",
    icon: Route,
    matchPatterns: ["/driver", "/driver/rides/:rideId"],
    roles: ["driver"]
  }
];

function getDriverNavItem(user: SessionUser | null): ShellNavItem | null {
  if (!userHasRole(user, "driver")) {
    return null;
  }

  const approved = user?.approvalStatus === "approved";

  return {
    ...driverItems[0],
    label: approved ? driverItems[0].label : "Onboarding",
    shortLabel: approved ? driverItems[0].shortLabel : "Apply",
    to: approved ? "/driver" : "/driver/signup",
    matchPatterns: approved ? driverItems[0].matchPatterns : ["/driver/signup", "/drive-with-us", ...driverItems[0].matchPatterns]
  };
}

const adminItems: ShellNavItem[] = [
  {
    id: "admin-overview",
    label: "Overview",
    to: "/admin",
    icon: LayoutDashboard,
    matchPatterns: ["/admin"],
    roles: ["admin"]
  },
  {
    id: "admin-dispatch",
    label: "Dispatch",
    to: "/admin/dispatch",
    icon: Route,
    matchPatterns: ["/admin/dispatch"],
    roles: ["admin"]
  },
  {
    id: "admin-team",
    label: "Team",
    to: "/admin/team",
    icon: ShieldCheck,
    matchPatterns: ["/admin/team"],
    roles: ["admin"]
  },
  {
    id: "admin-drivers",
    label: "Drivers",
    to: "/admin/drivers",
    icon: Users,
    matchPatterns: ["/admin/drivers"],
    roles: ["admin"]
  },
  {
    id: "admin-reports",
    label: "Reports",
    to: "/admin/reports",
    icon: BarChart3,
    matchPatterns: ["/admin/reports"],
    roles: ["admin"]
  },
  {
    id: "admin-regions",
    label: "Regions",
    to: "/admin/regions",
    icon: Globe,
    matchPatterns: ["/admin/regions"],
    roles: ["admin"]
  },
  {
    id: "admin-api-keys",
    label: "API keys",
    to: "/admin/api-keys",
    icon: KeyRound,
    matchPatterns: ["/admin/api-keys"],
    roles: ["admin"]
  },
  {
    id: "admin-dues",
    label: "Dues",
    to: "/admin/dues",
    icon: CreditCard,
    matchPatterns: ["/admin/dues"],
    roles: ["admin"]
  },
  {
    id: "admin-ads",
    label: "Ads",
    to: "/admin/ads",
    icon: Megaphone,
    matchPatterns: ["/admin/ads"],
    roles: ["admin"]
  },
  {
    id: "admin-ad-analytics",
    label: "Ad analytics",
    to: "/admin/ads/analytics",
    icon: BarChart3,
    matchPatterns: ["/admin/ads/analytics"],
    roles: ["admin"]
  },
  {
    id: "admin-pricing",
    label: "Pricing",
    to: "/admin/pricing",
    icon: Settings2,
    matchPatterns: ["/admin/pricing"],
    roles: ["admin"]
  },
  {
    id: "admin-share",
    label: "Share kit",
    to: "/admin/share",
    icon: QrCode,
    matchPatterns: ["/admin/share"],
    roles: ["admin"]
  },
  {
    id: "admin-data",
    label: "Data",
    to: "/admin/data",
    icon: BarChart3,
    matchPatterns: ["/admin/data"],
    roles: ["admin"]
  },
  {
    id: "admin-audit",
    label: "Audit",
    to: "/admin/audit",
    icon: ClipboardList,
    matchPatterns: ["/admin/audit"],
    roles: ["admin"]
  },
  {
    id: "admin-help",
    label: "Guide",
    to: "/admin/help",
    icon: BookOpen,
    matchPatterns: ["/admin/help"],
    roles: ["admin"]
  },
  {
    id: "admin-feature-requests",
    label: "Feature triage",
    to: "/admin/feature-requests",
    icon: Lightbulb,
    matchPatterns: ["/admin/feature-requests"],
    roles: ["admin"]
  }
];

const shellFrames: Array<{ patterns: string[]; frame: ShellFrame }> = [
  {
    patterns: ["/admin/dispatch"],
    frame: {
      eyebrow: "Admin",
      title: "Dispatch workspace",
      description: "Watch active and scheduled ride routes from one ride-first workspace. V1 dispatch is ride-first and does not add a new idle-driver live-location API.",
      mapMode: "ambient",
      mobileHeaderMode: "minimal",
      actions: [
        { label: "Overview", to: "/admin", icon: LayoutDashboard, variant: "secondary" },
        { label: "Drivers", to: "/admin/drivers", icon: Users, variant: "secondary" }
      ]
    }
  },
  {
    patterns: ["/admin"],
    frame: {
      eyebrow: "Admin",
      title: "Operations overview",
      description: "Monitor queues, drivers, dues, leads, dispatch, and ride operations from one control surface.",
      mapMode: "ambient",
      actions: [{ label: "Dispatch", to: "/admin/dispatch", icon: Route, variant: "primary" }]
    }
  },
  {
    patterns: ["/admin/team"],
    frame: {
      eyebrow: "Admin",
      title: "Team operations",
      description: "Invite trusted partner operators, watch workspace access, and keep admin management visible in the main shell.",
      mapMode: "ambient",
      actions: [{ label: "Share kit", to: "/admin/share", icon: QrCode, variant: "secondary" }]
    }
  },
  {
    patterns: ["/admin/drivers"],
    frame: {
      eyebrow: "Admin",
      title: "Driver operations",
      description: "Review applications, update driver settings, and keep availability aligned with the live network.",
      mapMode: "ambient",
      actions: [{ label: "Overview", to: "/admin", icon: LayoutDashboard, variant: "secondary" }]
    }
  },
  {
    patterns: ["/admin/reports"],
    frame: {
      eyebrow: "Admin",
      title: "Reporting",
      description: "Review revenue, fleet utilization, rider growth, and top-driver performance from one analytics surface.",
      mapMode: "ambient",
      actions: [{ label: "Overview", to: "/admin", icon: LayoutDashboard, variant: "secondary" }]
    }
  },
  {
    patterns: ["/admin/regions"],
    frame: {
      eyebrow: "Admin",
      title: "Regions",
      description: "Manage market-level operations, dispatch weighting, and activation across supported cities.",
      mapMode: "ambient",
      actions: [{ label: "Overview", to: "/admin", icon: LayoutDashboard, variant: "secondary" }]
    }
  },
  {
    patterns: ["/admin/api-keys"],
    frame: {
      eyebrow: "Admin",
      title: "API integrations",
      description: "Issue scoped credentials for external systems that read rides, drivers, pricing, and reporting data.",
      mapMode: "ambient",
      actions: [{ label: "Overview", to: "/admin", icon: LayoutDashboard, variant: "secondary" }]
    }
  },
  {
    patterns: ["/admin/dues"],
    frame: {
      eyebrow: "Admin",
      title: "Platform dues",
      description: "Clear overdue accounts, adjust manual payouts, and maintain the driver finance queue.",
      mapMode: "ambient",
      actions: [{ label: "Overview", to: "/admin", icon: LayoutDashboard, variant: "secondary" }]
    }
  },
  {
    patterns: ["/admin/pricing"],
    frame: {
      eyebrow: "Admin",
      title: "Platform pricing",
      description: "Tune market rate cards without inventing new products or flows.",
      mapMode: "ambient"
    }
  },
  {
    patterns: ["/notifications"],
    frame: {
      eyebrow: "Account",
      title: "Notification center",
      description: "Manage push notifications, SMS critical fallback, and recent delivery results.",
      mapMode: "off",
      mobileHeaderMode: "minimal"
    }
  },
  {
    patterns: ["/admin/share"],
    frame: {
      eyebrow: "Admin",
      title: "Business share kit",
      description: "Manage recruit links, QR assets, and launch links without mixing in team-management work.",
      mapMode: "ambient",
      actions: [{ label: "Team", to: "/admin/team", icon: ShieldCheck, variant: "secondary" }]
    }
  },
  {
    patterns: ["/admin/data"],
    frame: {
      eyebrow: "Admin",
      title: "Traffic and activity",
      description: "Track active visitors, 24h session volume, and the most visited routes.",
      mapMode: "ambient",
      actions: [{ label: "Overview", to: "/admin", icon: LayoutDashboard, variant: "secondary" }]
    }
  },
  {
    patterns: ["/admin/help"],
    frame: {
      eyebrow: "Admin",
      title: "Collector guide",
      description: "Keep dues collection, ownership transfer, and partner onboarding documented inside the live admin shell.",
      mapMode: "ambient"
    }
  },
  {
    patterns: ["/admin/invite/:token"],
    frame: {
      eyebrow: "Admin invite",
      title: "Accept workspace invite",
      description: "Create your admin collector account from a live invite link.",
      mapMode: "off",
      mobileHeaderMode: "minimal"
    }
  },
  {
    patterns: ["/admin/ads"],
    frame: {
      eyebrow: "Admin",
      title: "Ad operations",
      description: "Approve submissions, publish driver-assigned screens, and track dues-offset credit from scans.",
      mapMode: "off",
      actions: [{ label: "Share kit", to: "/admin/share", icon: QrCode, variant: "secondary" }]
    }
  },
  {
    patterns: ["/driver"],
    frame: {
      eyebrow: "Driver",
      title: "Driver home",
      description: "Sign on fast, keep the map visible, and move from offer to active trip without the admin-dashboard feel.",
      mapMode: "ambient",
      mobileHeaderMode: "minimal"
    }
  },
  {
    patterns: ["/driver/rides/:rideId"],
    frame: {
      eyebrow: "Driver",
      title: "Active trip",
      description: "Stay in the live trip flow with route context, rider details, and one-tap status changes.",
      layout: "immersive",
      mapMode: "immersive",
      mobileHeaderMode: "minimal",
      actions: [{ label: "Dashboard", to: "/driver", icon: Route, variant: "secondary" }]
    }
  },
  {
    patterns: ["/driver/inbox"],
    frame: {
      eyebrow: "Driver",
      title: "Offer inbox",
      description: "Triaging pending jobs stays inside the same live map shell instead of dropping into a separate admin page.",
      layout: "immersive",
      mapMode: "immersive",
      mobileHeaderMode: "minimal",
      actions: [{ label: "Dashboard", to: "/driver", icon: Route, variant: "secondary" }]
    }
  },
  {
    patterns: ["/ads/display/:referralCode"],
    frame: {
      eyebrow: "Ads",
      title: "Driver ad display",
      description: "Fullscreen display page for the driver flyer plus approved paid ad rotation.",
      layout: "immersive",
      mapMode: "off",
      mobileHeaderMode: "minimal"
    }
  },
  {
    patterns: ["/ads/visit/:redirectToken"],
    frame: {
      eyebrow: "Ads",
      title: "Visit redirect",
      description: "Logs the ad visit and forwards the scan to the advertiser destination.",
      mapMode: "off",
      mobileHeaderMode: "minimal"
    }
  },
  {
    patterns: ["/advertise"],
    frame: {
      eyebrow: "Advertise",
      title: "Advertise on RealDrive",
      description: "Submit one image creative for manual review, payment confirmation, and driver screen rotation.",
      mapMode: "off",
      mobileHeaderMode: "minimal"
    }
  },
  {
    patterns: ["/rider/login"],
    frame: {
      eyebrow: "Rider",
      title: "Rider access",
      description: "Returning riders can sign in with a phone code while guest booking stays available on the public home page.",
      mapMode: "off",
      mobileHeaderMode: "minimal",
      actions: [{ label: "Book ride", to: "/", icon: CarFront, variant: "primary" }]
    }
  },
  {
    patterns: ["/rider/rides"],
    frame: {
      eyebrow: "Rider",
      title: "My rides",
      description: "Open active, scheduled, and completed trips from one rider history view.",
      mapMode: "ambient",
      actions: [{ label: "Book ride", to: "/", icon: CarFront, variant: "primary" }]
    }
  },
  {
    patterns: ["/rider/rides/:rideId"],
    frame: {
      eyebrow: "Rider",
      title: "Ride detail",
      description: "Track progress, payment, and rider follow-up actions from the live trip panel.",
      layout: "immersive",
      mapMode: "immersive",
      actions: [{ label: "My rides", to: "/rider/rides", icon: UserRound, variant: "secondary" }]
    }
  },
  {
    patterns: ["/track/:token"],
    frame: {
      eyebrow: "Tracking",
      title: "Live trip tracking",
      description: "Follow status, route progress, and rider follow-up tools without signing in.",
      layout: "immersive",
      mapMode: "immersive"
    }
  },
  {
    patterns: ["/community"],
    frame: {
      eyebrow: "Community",
      title: "Community board",
      description: "Read, post, vote, and moderate proposals inside the same ops language as the rest of the app.",
      mapMode: "ambient",
      mobileHeaderMode: "minimal"
    }
  },
  {
    patterns: ["/roadmap"],
    frame: {
      eyebrow: "Product",
      title: "Public roadmap",
      description: "Review active and next work, then use the same feature and bug intake flows that feed admin triage.",
      mapMode: "off",
      mobileHeaderMode: "minimal"
    }
  },
  {
    patterns: ["/request-feature"],
    frame: {
      eyebrow: "Product",
      title: "Request a feature",
      description: "Share feature ideas directly with context so the engineering queue can pick them up quickly.",
      mapMode: "off",
      mobileHeaderMode: "minimal"
    }
  },
  {
    patterns: ["/report-bug"],
    frame: {
      eyebrow: "Support",
      title: "Report a bug",
      description: "Log visible product issues quickly, even when the app does not show an error code.",
      mapMode: "off",
      mobileHeaderMode: "minimal"
    }
  },
  {
    patterns: ["/driver/signup", "/drive-with-us"],
    frame: {
      eyebrow: "Driver",
      title: "Drive with RealDrive",
      description: "Apply with the real onboarding flow and keep approvals tied to the live admin review queue.",
      mapMode: "off",
      mobileHeaderMode: "minimal"
    }
  },
  {
    patterns: ["/driver/login"],
    frame: {
      eyebrow: "Driver",
      title: "Driver access",
      description: "Approved drivers sign in here to manage live offers, rides, and dues.",
      mapMode: "off",
      mobileHeaderMode: "minimal"
    }
  },
  {
    patterns: ["/admin/login", "/admin/setup"],
    frame: {
      eyebrow: "Admin",
      title: "Admin access",
      description: "Create or enter the real operations account that controls dispatch, dues, pricing, and share assets.",
      mapMode: "off"
    }
  },
  {
    patterns: ["/community/join/:token"],
    frame: {
      eyebrow: "Community",
      title: "Community access",
      description: "Exchange rider access safely and land inside the real shared community board.",
      mapMode: "off"
    }
  },
  {
    patterns: ["/share/:referralCode"],
    frame: {
      eyebrow: "Share",
      title: "Referral redirect",
      description: "Send shared traffic back into the live rider booking flow.",
      mapMode: "off"
    }
  },
  {
    patterns: ["/"],
    frame: {
      eyebrow: "Ride",
      title: "Book a ride",
      description: "Quote, book, track, and share from the same live rider surface.",
      mapMode: "off",
      mobileHeaderMode: "minimal"
    }
  }
];

export function getShellSections(user: SessionUser | null): ShellSection[] {
  const sections: ShellSection[] = [];

  const visibleRiderItems = riderItems.filter((item) => canRenderItem(item, user));
  if (visibleRiderItems.length) {
    sections.push({ id: "ride", label: "Ride", items: visibleRiderItems });
  }

  const visibleDriverItems = [getDriverNavItem(user)].filter((item): item is ShellNavItem => item !== null);
  if (visibleDriverItems.length) {
    sections.push({ id: "driver", label: "Driver", items: visibleDriverItems });
  }

  const visibleAdminItems = adminItems.filter((item) => canRenderItem(item, user));
  if (visibleAdminItems.length) {
    sections.push({ id: "admin", label: "Admin", items: visibleAdminItems });
  }

  const visibleSharedItems = sharedItems.filter((item) => canRenderItem(item, user));
  if (visibleSharedItems.length) {
    sections.push({ id: "shared", label: "Shared", items: visibleSharedItems });
  }

  return sections;
}

export function getMobileNavItems(user: SessionUser | null, options?: { driverRidePath?: string; driverInboxPath?: string }): ShellNavItem[] {
  const notificationsItem = sharedItems.find((item) => item.id === "notifications");

  if (user?.role === "admin") {
    return [
      adminItems.find((item) => item.id === "admin-overview"),
      adminItems.find((item) => item.id === "admin-dispatch"),
      adminItems.find((item) => item.id === "admin-drivers"),
      adminItems.find((item) => item.id === "admin-dues"),
      notificationsItem
    ]
      .filter((item): item is ShellNavItem => item !== null)
      .filter((item) => canRenderItem(item, user));
  }

  if (user?.role === "driver") {
    const driverHomeItem: ShellNavItem = {
      id: "driver-home-mobile",
      label: "Home",
      shortLabel: "Home",
      to: "/driver?tab=home",
      icon: LayoutDashboard,
      matchPatterns: ["/driver"],
      searchParamKey: "tab",
      searchParamValue: "home",
      activeWhenSearchMissing: true,
      roles: ["driver"]
    };

    const driverRideItem: ShellNavItem = {
      id: "driver-ride-mobile",
      label: "Ride",
      shortLabel: "Ride",
      to: options?.driverRidePath ?? "/driver?tab=ride",
      icon: Route,
      matchPatterns: options?.driverRidePath?.startsWith("/driver/rides/") ? ["/driver/rides/:rideId"] : ["/driver"],
      ...(options?.driverRidePath?.startsWith("/driver/rides/")
        ? {}
        : {
            searchParamKey: "tab",
            searchParamValue: "ride"
          }),
      roles: ["driver"]
    };

    const driverInboxItem: ShellNavItem = {
      id: "driver-inbox-mobile",
      label: "Inbox",
      shortLabel: "Inbox",
      to: options?.driverInboxPath ?? "/driver?tab=inbox",
      icon: ClipboardList,
      matchPatterns: options?.driverInboxPath?.startsWith("/driver/inbox") ? ["/driver/inbox", "/driver"] : ["/driver"],
      ...(options?.driverInboxPath?.startsWith("/driver/inbox")
        ? {
            searchParamKey: "tab",
            searchParamValue: "inbox"
          }
        : {
            searchParamKey: "tab",
            searchParamValue: "inbox"
          }),
      roles: ["driver"]
    };

    const driverAccountItem: ShellNavItem = {
      id: "driver-account-mobile",
      label: "Account",
      shortLabel: "Account",
      to: "/driver?tab=account",
      icon: UserRound,
      matchPatterns: ["/driver"],
      searchParamKey: "tab",
      searchParamValue: "account",
      roles: ["driver"]
    };

    return [driverHomeItem, driverRideItem, driverInboxItem, notificationsItem, driverAccountItem]
      .filter((item): item is ShellNavItem => item !== null)
      .filter((item) => canRenderItem(item, user));
  }

  return [riderItems[0], riderItems[1], notificationsItem, riderItems[2]]
    .filter((item): item is ShellNavItem => item !== null)
    .filter((item) => canRenderItem(item, user));
}

export function getShellFrame(pathname: string, user: SessionUser | null): ShellFrame {
  const match = shellFrames.find((entry) =>
    entry.patterns.some((pattern) => matchPath({ path: pattern, end: pattern === "/" || !pattern.endsWith(":token") }, pathname))
  );

  if (match) {
    return match.frame;
  }

  return {
    eyebrow: user ? roleLabel(user.role) : "RealDrive",
    title: "RealDrive Control Center",
    description: "Use the live routes that exist today. No dead buttons, no fake modules, and no stale shell actions.",
    mapMode: user ? "ambient" : "off"
  };
}

export function isNavItemActive(item: ShellNavItem, pathname: string, search = "") {
  const destinationPath = item.to.split(/[?#]/)[0];
  const pathMatches = item.matchPatterns.some((pattern) => matchPath({ path: pattern, end: pattern === destinationPath }, pathname));

  if (!pathMatches) {
    return false;
  }

  if (!item.searchParamKey) {
    return true;
  }

  const params = new URLSearchParams(search);
  const value = params.get(item.searchParamKey);

  if (!value) {
    return Boolean(item.activeWhenSearchMissing) || pathname === destinationPath;
  }

  return value === item.searchParamValue;
}

function canRenderItem(item: ShellNavItem, user: SessionUser | null) {
  if (item.requiresAuth && !user) {
    return false;
  }

  if (item.roles?.length && !item.roles.some((role) => userHasRole(user, role))) {
    return false;
  }

  if (item.hidden?.(user)) {
    return false;
  }

  return true;
}
