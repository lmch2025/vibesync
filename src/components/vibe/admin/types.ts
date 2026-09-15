// Shared admin API types (mirrors the JSON returned by /api/vibe/admin/* routes).

export type AdminKpis = {
  users: number;
  profiles: number;
  dau: number;
  matches: number;
  messages: number;
  gifts: number;
  boosts: number;
  reports: number;
  matchRate: number; // 0..1
  conversionRate: number; // 0..1
  revenueEurCents: number;
  giftsValueEurCents: number;
  platformCommissionCents: number;
  payingUsers: number;
};

export type AdminStats = {
  kpis: AdminKpis;
  series: {
    retention: number[]; // 7 values, %, J0..J6
    revenue: number[]; // 7 values, EUR cents
    gifts: number[]; // 7 values, count
  };
};

export type AdminUser = {
  id: string;
  phone: string; // masked
  name: string | null;
  displayName: string | null;
  role: string;
  currency: string;
  gems: number;
  walletEurCents: number;
  verified: boolean;
  banned: boolean;
  createdAt: string;
  city: string | null;
};

export type AdminReport = {
  id: string;
  reason: string;
  source: "ai" | "user";
  status: "pending" | "approved" | "removed";
  createdAt: string;
  profile: {
    id: string;
    displayName: string;
    age: number;
    city: string;
    bio: string;
    videoUrl: string;
    posterUrl: string;
    userId: string;
  };
};

export type AdminSectionId =
  | "overview"
  | "users"
  | "moderation"
  | "gifts"
  | "analytics"
  | "settings";
