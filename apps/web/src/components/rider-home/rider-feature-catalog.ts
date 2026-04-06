import type { LucideIcon } from "lucide-react";
import { Bell, CalendarClock, CarFront, Receipt, ShieldCheck, Star, Route, Users } from "lucide-react";

export type RiderFeatureStatus = "live" | "coming-soon";
export type RiderFeaturePhase = "live-now" | "phase-2" | "phase-3";
export type RiderFeatureContext = "public" | "rider";

export interface RiderFeatureItem {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  status: RiderFeatureStatus;
  phase: RiderFeaturePhase;
  livePath: Record<RiderFeatureContext, string>;
  requestSummary?: string;
}

export const RIDER_FEATURE_ITEMS: RiderFeatureItem[] = [
  {
    id: "ride-now",
    title: "Ride",
    subtitle: "Book now",
    icon: CarFront,
    status: "live",
    phase: "live-now",
    livePath: {
      public: "/",
      rider: "/"
    }
  },
  {
    id: "my-trips",
    title: "Trips",
    subtitle: "History + live",
    icon: Route,
    status: "live",
    phase: "live-now",
    livePath: {
      public: "/rider/login",
      rider: "/rider/rides"
    }
  },
  {
    id: "community",
    title: "Community",
    subtitle: "Board access",
    icon: Users,
    status: "live",
    phase: "live-now",
    livePath: {
      public: "/rider/login",
      rider: "/community"
    }
  },
  {
    id: "alerts",
    title: "Alerts",
    subtitle: "Push status",
    icon: Bell,
    status: "live",
    phase: "live-now",
    livePath: {
      public: "/rider/login",
      rider: "/notifications"
    }
  },
  {
    id: "reserve",
    title: "Reserve",
    subtitle: "Planned trips",
    icon: CalendarClock,
    status: "coming-soon",
    phase: "phase-2",
    livePath: {
      public: "/rider/login",
      rider: "/rider/rides"
    },
    requestSummary: "Add a dedicated reserve flow in the rider map shell"
  },
  {
    id: "saved-places",
    title: "Saved",
    subtitle: "Home + work",
    icon: Star,
    status: "coming-soon",
    phase: "phase-2",
    livePath: {
      public: "/rider/login",
      rider: "/rider/rides"
    },
    requestSummary: "Add saved places and quick destination shortcuts for riders"
  },
  {
    id: "receipts",
    title: "Receipts",
    subtitle: "Trip totals",
    icon: Receipt,
    status: "coming-soon",
    phase: "phase-3",
    livePath: {
      public: "/rider/login",
      rider: "/rider/rides"
    },
    requestSummary: "Add a rider receipts and trip totals hub"
  },
  {
    id: "safety",
    title: "Safety",
    subtitle: "Ride help",
    icon: ShieldCheck,
    status: "coming-soon",
    phase: "phase-3",
    livePath: {
      public: "/rider/login",
      rider: "/rider/rides"
    },
    requestSummary: "Add a rider safety toolkit with support shortcuts and trip safeguards"
  }
];
