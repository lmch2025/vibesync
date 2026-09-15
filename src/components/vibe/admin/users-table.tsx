"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search, MoreVertical, Ban, Pause, BadgeCheck, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GemIcon } from "@/components/vibe/gem-badge";
import { SuccessBounce } from "@/components/vibe/app/interactive-animations";
import { useCurrency } from "@/lib/vibe/use-currency";
import { cn } from "@/lib/utils";
import type { AdminUser } from "./types";

function initials(s: string): string {
  const parts = s.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function RoleBadge({ role }: { role: string }) {
  if (role === "admin") {
    return <Badge className="bg-accent/15 text-accent border-transparent">Admin</Badge>;
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Membre
    </Badge>
  );
}

export function UsersTable({
  externalQ,
  onExternalQChange,
}: {
  externalQ?: string;
  onExternalQChange?: (q: string) => void;
}) {
  const { moneyCents } = useCurrency();
  const [internalQ, setInternalQ] = useState("");
  const q = externalQ ?? internalQ;
  const setQ = onExternalQChange ?? setInternalQ;
  const [debounced, setDebounced] = useState("");
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banned, setBanned] = useState<Record<string, boolean>>({});
  const [verified, setVerified] = useState<Record<string, boolean>>({});
  const reqIdRef = useRef(0);

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const reqId = ++reqIdRef.current;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    const url = `/api/vibe/admin/users${debounced ? `?q=${encodeURIComponent(debounced)}` : ""}`;
    fetch(url, { signal: controller.signal })
      .then(async (r) => {
        if (r.status === 403) throw new Error("Accès refusé, connectez-vous en admin");
        if (!r.ok) throw new Error("Erreur lors du chargement des utilisateurs");
        return r.json() as Promise<{ users: AdminUser[] }>;
      })
      .then((data) => {
        if (reqId !== reqIdRef.current) return;
        setUsers(data.users);
      })
      .catch((e: Error) => {
        if (reqId !== reqIdRef.current || e.name === "AbortError") return;
        setError(e.message);
        setUsers([]);
      })
      .finally(() => {
        if (reqId === reqIdRef.current) setLoading(false);
      });
    return () => {
      controller.abort();
    };
  }, [debounced]);

  const total = users?.length ?? 0;

  const rows = useMemo(() => users ?? [], [users]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, téléphone, ville…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <UsersIcon className="h-3.5 w-3.5" />
          <span>
            {loading ? "…" : `${total} utilisateur${total > 1 ? "s" : ""}`}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-destructive/10 text-destructive px-4 py-3 text-sm ring-1 ring-destructive/20">
          {error}
        </div>
      )}

      <div className="rounded-2xl bg-card ring-1 ring-border overflow-hidden">
        <div className="max-h-96 overflow-y-auto scrollbar-vibe">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="pl-4">Utilisateur</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead className="hidden md:table-cell">Ville</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="text-right">Vibes</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Portefeuille</TableHead>
                <TableHead className="hidden lg:table-cell">Statut</TableHead>
                <TableHead className="hidden md:table-cell">Inscrit le</TableHead>
                <TableHead className="pr-2 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`s-${i}`}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-2 w-16" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-3 w-20" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-3 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-3 w-10 ml-auto" /></TableCell>
                    <TableCell className="text-right hidden sm:table-cell"><Skeleton className="h-3 w-14 ml-auto" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-3 w-20" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))}

              {!loading && rows.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Search className="h-6 w-6 opacity-40" />
                      <p className="text-sm">Aucun utilisateur trouvé</p>
                      <p className="text-xs">Essayez un autre terme de recherche.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                rows.map((u, i) => {
                  const isBanned = banned[u.id] ?? u.banned;
                  const isVerified = verified[u.id] ?? u.verified;
                  const displayName = u.displayName ?? u.name ?? u.phone;
                  // Banned dim is driven by framer (inline opacity) so the CSS
                  // transition stays colors-only — mixing a CSS opacity transition
                  // with framer's per-frame style updates would look choppy.
                  return (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isBanned ? 0.6 : 1 }}
                      transition={{ duration: 0.5, delay: Math.min(i * 0.02, 0.15) }}
                      className={cn(
                        "border-b border-border transition-colors hover:bg-muted/40",
                        isBanned && "opacity-60"
                      )}
                    >
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-9 w-9 ring-1 ring-border">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {initials(displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate max-w-[160px]">
                              {displayName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                              {u.name ?? "—"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {u.phone}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {u.city ?? "—"}
                      </TableCell>
                      <TableCell>
                        <RoleBadge role={u.role} />
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1 text-sm font-medium tabular-nums">
                          <GemIcon className="h-3 w-3" />
                          {u.gems.toLocaleString("fr-FR")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell text-sm tabular-nums font-medium">
                        {moneyCents(u.walletEurCents)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          {isVerified && (
                            <SuccessBounce>
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent">
                                <BadgeCheck className="h-3 w-3" /> Vérifié
                              </Badge>
                            </SuccessBounce>
                          )}
                          {isBanned && (
                            <Badge variant="destructive">
                              <Ban className="h-3 w-3" /> Banni
                            </Badge>
                          )}
                          {!isVerified && !isBanned && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {formatDate(u.createdAt)}
                      </TableCell>
                      <TableCell className="pr-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.9 }}
                              className={cn(
                                buttonVariants({
                                  variant: "ghost",
                                  size: "icon",
                                  className: "h-8 w-8",
                                })
                              )}
                            >
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </motion.button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">
                              Actions
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setBanned((m) => ({ ...m, [u.id]: true }));
                                toast.success("Utilisateur banni (démo)", {
                                  description: displayName,
                                });
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Ban className="h-4 w-4" /> Bannir
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                toast.info("Utilisateur suspendu 7j (démo)", {
                                  description: displayName,
                                })
                              }
                            >
                              <Pause className="h-4 w-4" /> Suspendre
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setVerified((m) => ({ ...m, [u.id]: !isVerified }));
                                toast.success(
                                  isVerified
                                    ? "Badge vérifié retiré (démo)"
                                    : "Badge vérifié accordé (démo)",
                                  { description: displayName }
                                );
                              }}
                            >
                              <BadgeCheck className="h-4 w-4" />
                              {isVerified ? "Retirer badge" : "Vérifier (badge bleu)"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
