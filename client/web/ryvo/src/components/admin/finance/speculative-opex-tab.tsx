"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { useOpexConfig } from "@/hooks/use-opex-config";
import { monthlyOpex, opexHourlyBand, type BandwidthMode, type OpexResource } from "@/lib/finance-speculative";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const emptyForm = (): Omit<OpexResource, "id"> => ({
  provider: "",
  cpus: 2,
  ramGb: 4,
  storageGb: 50,
  bandwidthMode: "metered",
  bandwidthGb: 100,
  pricePerHour: 0.1,
  marginDown: -0.1,
  marginUp: 0.15,
});

export function SpeculativeOpexTab() {
  const { t } = useTranslation();
  const { resources, addResource, removeResource } = useOpexConfig();
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);

  const monthly = monthlyOpex(resources);

  function submit() {
    if (!form.provider.trim()) return;
    addResource({
      ...form,
      id: `res-${Date.now()}`,
      provider: form.provider.trim(),
    });
    setForm(emptyForm());
    setOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="border-border bg-muted/40 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4">
        <div>
          <p className="text-sm font-semibold">{t("speculative.opex.monthlyEstimate")}</p>
          <p className="text-muted-foreground text-xs">{t("speculative.opex.hourlyUnit")}</p>
        </div>
        <p className="text-primary text-xl font-bold">
          ${monthly.low.toFixed(0)} – ${monthly.high.toFixed(0)}
          <span className="text-muted-foreground text-sm font-normal"> / mo</span>
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <RyvoButton intent="cta">
            <Plus className="size-4" /> {t("speculative.opex.addResource")}
          </RyvoButton>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("speculative.opex.addResource")}</DialogTitle>
          </DialogHeader>
          <OpexFormFields form={form} setForm={setForm} t={t} />
          <RyvoButton intent="cta" className="w-full" onClick={submit}>
            {t("common.save")}
          </RyvoButton>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {resources.map((r) => {
          const band = opexHourlyBand(r);
          return (
            <div key={r.id} className="border-border bg-card rounded-2xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{r.provider}</p>
                  <p className="text-muted-foreground text-xs">
                    {r.cpus} CPU · {r.ramGb} GB RAM · {r.storageGb} GB storage ·{" "}
                    {r.bandwidthMode === "unlimited"
                      ? t("speculative.opex.bandwidthUnlimited")
                      : `${r.bandwidthGb ?? 0} GB ${t("speculative.opex.bandwidthMetered")}`}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-destructive hover:bg-destructive/10 rounded-lg p-2"
                  onClick={() => removeResource(r.id)}
                  aria-label={t("actions.delete")}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <p className="mt-2 text-sm">
                ${band.low.toFixed(3)} – ${band.high.toFixed(3)} / hr
                <span className="text-muted-foreground">
                  {" "}
                  ({t("speculative.opex.margin")}: {r.marginDown} : +{r.marginUp})
                </span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OpexFormFields({
  form,
  setForm,
  t,
}: {
  form: Omit<OpexResource, "id">;
  setForm: (f: Omit<OpexResource, "id">) => void;
  t: (k: string) => string;
}) {
  return (
    <div className="grid gap-3 py-2">
      <div className="space-y-1">
        <Label>{t("speculative.opex.provider")}</Label>
        <Input
          value={form.provider}
          onChange={(e) => setForm({ ...form, provider: e.target.value })}
          placeholder="AWS / Supabase / …"
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label>{t("speculative.opex.cpus")}</Label>
          <Input
            type="number"
            min={1}
            value={form.cpus}
            onChange={(e) => setForm({ ...form, cpus: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1">
          <Label>{t("speculative.opex.ram")}</Label>
          <Input
            type="number"
            min={1}
            value={form.ramGb}
            onChange={(e) => setForm({ ...form, ramGb: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1">
          <Label>{t("speculative.opex.storage")}</Label>
          <Input
            type="number"
            min={0}
            value={form.storageGb}
            onChange={(e) => setForm({ ...form, storageGb: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label>{t("speculative.opex.bandwidth")}</Label>
        <select
          className="border-border bg-background w-full rounded-xl border px-3 py-2 text-sm"
          value={form.bandwidthMode}
          onChange={(e) =>
            setForm({ ...form, bandwidthMode: e.target.value as BandwidthMode })
          }
        >
          <option value="unlimited">{t("speculative.opex.bandwidthUnlimited")}</option>
          <option value="metered">{t("speculative.opex.bandwidthMetered")}</option>
        </select>
      </div>
      {form.bandwidthMode === "metered" && (
        <div className="space-y-1">
          <Label>{t("speculative.opex.bandwidthGb")}</Label>
          <Input
            type="number"
            min={0}
            value={form.bandwidthGb ?? 0}
            onChange={(e) => setForm({ ...form, bandwidthGb: Number(e.target.value) })}
          />
        </div>
      )}
      <div className="space-y-1">
        <Label>{t("speculative.opex.priceHour")}</Label>
        <Input
          type="number"
          step="0.001"
          min={0}
          value={form.pricePerHour}
          onChange={(e) => setForm({ ...form, pricePerHour: Number(e.target.value) })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>{t("speculative.opex.marginDown")}</Label>
          <Input
            type="number"
            step="0.01"
            value={form.marginDown}
            onChange={(e) => setForm({ ...form, marginDown: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1">
          <Label>{t("speculative.opex.marginUp")}</Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            value={form.marginUp}
            onChange={(e) => setForm({ ...form, marginUp: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}
