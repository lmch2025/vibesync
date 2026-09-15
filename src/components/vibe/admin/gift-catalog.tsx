"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Flame, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { GemIcon } from "@/components/vibe/gem-badge";
import { useCurrency } from "@/lib/vibe/use-currency";

type Gift = {
  id: string;
  key: string;
  name: string;
  emoji: string;
  gemCost: number;
  eurValueCents: number;
  popular?: boolean;
};

function GiftCard({ gift, index, onDelete }: { gift: Gift; index: number; onDelete: () => void }) {
  const { moneyCents } = useCurrency();
  const receiverShare = Math.round(gift.eurValueCents * 0.7);
  const platformShare = Math.round(gift.eurValueCents * 0.3);
  const [confirming, setConfirming] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.3) }}
      className="relative overflow-hidden rounded-2xl bg-card ring-1 ring-border shadow-sm p-4 flex flex-col gap-3"
    >
      {gift.popular && (
        <span className="absolute top-3 right-3">
          <Badge className="bg-accent/15 text-accent border-transparent gap-1">
            <Flame className="h-3 w-3" /> Populaire
          </Badge>
        </span>
      )}
      <div className="flex items-center gap-3">
        <span className="grid place-items-center h-12 w-12 rounded-xl bg-muted/60 ring-1 ring-border text-2xl">
          {gift.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm leading-tight truncate">{gift.name}</p>
          <p className="text-xs text-muted-foreground">{gift.key}</p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-muted/40 ring-1 ring-border px-3 py-2">
        <span className="text-xs text-muted-foreground">Coût</span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums">
          <GemIcon className="h-3.5 w-3.5" />
          {gift.gemCost}
        </span>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Valeur totale</span>
          <span className="font-semibold tabular-nums">{moneyCents(gift.eurValueCents)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Receveur · 70%</span>
          <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {moneyCents(receiverShare)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Plateforme · 30%</span>
          <span className="font-semibold tabular-nums text-primary">
            {moneyCents(platformShare)}
          </span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full text-destructive hover:text-destructive hover:bg-destructive/5 mt-1"
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="h-3.5 w-3.5" /> Supprimer
      </Button>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="rounded-2xl max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Supprimer ce cadeau ?</DialogTitle>
            <DialogDescription>
              {gift.emoji} {gift.name} ne sera plus disponible. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="button" variant="destructive" onClick={onDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

export function GiftCatalog() {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [gemCost, setGemCost] = useState("");
  const [eurValue, setEurValue] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vibe/admin/gifts");
      const data = await res.json();
      if (res.ok) setGifts(data.gifts ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setName("");
    setEmoji("");
    setGemCost("");
    setEurValue("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !emoji.trim()) {
      toast.error("Nom et emoji requis");
      return;
    }
    setCreating(true);
    try {
      const key = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const res = await fetch("/api/vibe/admin/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          name: name.trim(),
          emoji: emoji.trim(),
          gemCost: Number(gemCost) || 10,
          eurValueCents: Math.round((Number(eurValue) || 0.5) * 100),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${emoji} ${name} créé !`);
      reset();
      setOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/vibe/admin/gifts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Cadeau supprimé");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Catalogue de {gifts.length} cadeaux virtuels. La valeur en € est reversée à 70% au destinataire / 30% à la plateforme.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nouveau cadeau</span>
              <span className="sm:hidden">Nouveau</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Créer un cadeau</DialogTitle>
              <DialogDescription>
                Configure le cadeau. La valeur en € détermine ce que le destinataire reçoit sur son wallet.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-[auto_1fr] gap-3">
                <div className="space-y-2">
                  <Label htmlFor="gift-emoji">Emoji</Label>
                  <Input
                    id="gift-emoji"
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    placeholder="🎁"
                    maxLength={4}
                    className="w-20 text-center text-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gift-name">Nom du cadeau</Label>
                  <Input
                    id="gift-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Coffret Spa"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="gift-gemcost">Coût (Vibes)</Label>
                  <Input
                    id="gift-gemcost"
                    type="number"
                    min={1}
                    value={gemCost}
                    onChange={(e) => setGemCost(e.target.value)}
                    placeholder="50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gift-eur">Valeur (€)</Label>
                  <Input
                    id="gift-eur"
                    type="number"
                    min={0}
                    step="0.01"
                    value={eurValue}
                    onChange={(e) => setEurValue(e.target.value)}
                    placeholder="5.00"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="ghost">Annuler</Button>
                </DialogClose>
                <Button type="submit" disabled={creating}>{creating ? "Création…" : "Créer le cadeau"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid place-items-center py-12">
          <div className="h-8 w-8 rounded-full border-2 border-border border-t-primary animate-spin" />
        </div>
      ) : gifts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Aucun cadeau. Crée le premier !</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {gifts.map((g, i) => (
            <GiftCard key={g.id} gift={g} index={i} onDelete={() => onDelete(g.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
