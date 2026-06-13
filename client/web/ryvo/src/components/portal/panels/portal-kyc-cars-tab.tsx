"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Car, Eye, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KYC_STATUS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { storageService } from "@/services/storage.service";
import { vehiclesService, type DriverVehicle } from "@/services/vehicles.service";
import { cn } from "@/lib/utils";

const emptyForm = {
  make: "",
  model: "",
  year: new Date().getFullYear(),
  plate: "",
  brand: "",
  name: "",
  energy_type: "fuel",
  tyres_type: "",
  carbon_print: "",
  max_speed_kmh: "",
  age_years: "",
};

export function PortalKycCarsTab() {
  const { t } = useTranslation();
  const { accessToken, user } = useAuth();
  const qc = useQueryClient();
  const regRef = useRef<HTMLInputElement>(null);
  const insRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DriverVehicle | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [docVehicleId, setDocVehicleId] = useState<string | null>(null);
  const [docKind, setDocKind] = useState<"registration" | "insurance" | null>(null);
  const [viewDoc, setViewDoc] = useState<{ vehicleId: string; docId: string } | null>(null);

  const listQ = useQuery({
    queryKey: ["portal", "vehicles"],
    queryFn: () => vehiclesService.listMine(accessToken),
    enabled: Boolean(accessToken),
  });

  const viewQ = useQuery({
    queryKey: ["portal", "vehicle-doc-view", viewDoc],
    queryFn: () =>
      vehiclesService.getDocumentViewUrl(accessToken, viewDoc!.vehicleId, viewDoc!.docId),
    enabled: Boolean(accessToken && viewDoc),
  });

  const saveM = useMutation({
    mutationFn: async () => {
      const body = {
        make: form.make,
        model: form.model,
        year: Number(form.year),
        plate: form.plate || null,
        brand: form.brand || null,
        name: form.name || null,
        energy_type: form.energy_type,
        tyres_type: form.tyres_type || null,
        carbon_print: form.carbon_print ? Number(form.carbon_print) : null,
        max_speed_kmh: form.max_speed_kmh ? Number(form.max_speed_kmh) : null,
        age_years: form.age_years ? Number(form.age_years) : null,
      };
      if (editing) return vehiclesService.update(accessToken, editing.id, body);
      return vehiclesService.create(accessToken, body);
    },
    onSuccess: () => {
      toast.success(t("portal.kyc.carSaved"));
      setFormOpen(false);
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ["portal", "vehicles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => vehiclesService.remove(accessToken, id),
    onSuccess: () => {
      toast.success(t("portal.kyc.carDeleted"));
      void qc.invalidateQueries({ queryKey: ["portal", "vehicles"] });
    },
  });

  const uploadDocM = useMutation({
    mutationFn: async ({
      vehicleId,
      docType,
      file,
    }: {
      vehicleId: string;
      docType: string;
      file: File;
    }) => {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `drivers/${user!.id}/vehicles/${vehicleId}/${docType}/${Date.now()}.${ext}`;
      const s3Key = await storageService.uploadFile(accessToken, file, path);
      return vehiclesService.submitDocument(accessToken, vehicleId, { doc_type: docType, s3_key: s3Key });
    },
    onSuccess: () => {
      toast.success(t("portal.kyc.uploaded"));
      void qc.invalidateQueries({ queryKey: ["portal", "vehicles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadBannerM = useMutation({
    mutationFn: async ({ vehicleId, file }: { vehicleId: string; file: File }) => {
      const path = `drivers/${user!.id}/vehicles/${vehicleId}/banner/${Date.now()}.jpg`;
      const key = await storageService.uploadFile(accessToken, file, path);
      return vehiclesService.update(accessToken, vehicleId, { banner_key: key });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["portal", "vehicles"] }),
  });

  const vehicles = listQ.data?.vehicles ?? [];

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(v: DriverVehicle) {
    setEditing(v);
    setForm({
      make: v.make,
      model: v.model,
      year: v.year,
      plate: v.plate ?? "",
      brand: v.brand ?? "",
      name: v.name ?? "",
      energy_type: v.energy_type ?? "fuel",
      tyres_type: v.tyres_type ?? "",
      carbon_print: v.carbon_print != null ? String(v.carbon_print) : "",
      max_speed_kmh: v.max_speed_kmh != null ? String(v.max_speed_kmh) : "",
      age_years: v.age_years != null ? String(v.age_years) : "",
    });
    setFormOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">{t("portal.kyc.carsHint")}</p>
        <RyvoButton intent="cta" size="sm" onClick={openCreate}>
          <Plus className="size-4" /> {t("portal.kyc.addCar")}
        </RyvoButton>
      </div>

      {vehicles.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">{t("portal.kyc.noCars")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {vehicles.map((v) => (
            <div key={v.id} className="border-border rounded-2xl border p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Car className="text-primary size-5" />
                  <div>
                    <p className="font-semibold">
                      {v.brand || v.make} {v.name || v.model} ({v.year})
                    </p>
                    <p className="text-muted-foreground text-xs">{v.plate ?? "—"}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                    v.status === KYC_STATUS.approved
                      ? "bg-primary/15 text-primary"
                      : v.status === KYC_STATUS.rejected
                        ? "bg-destructive/15 text-destructive"
                        : "bg-amber-500/15 text-amber-700",
                  )}
                >
                  {v.status}
                </span>
              </div>
              {v.rejection_reason && v.status === KYC_STATUS.rejected ? (
                <p className="text-destructive mb-2 text-xs">{v.rejection_reason}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <RyvoButton intent="outline" size="sm" onClick={() => openEdit(v)}>
                  <Pencil className="size-3.5" /> {t("portal.kyc.editCar")}
                </RyvoButton>
                <RyvoButton
                  intent="outline"
                  size="sm"
                  onClick={() => {
                    setDocVehicleId(v.id);
                    setDocKind("registration");
                    regRef.current?.click();
                  }}
                >
                  <Upload className="size-3.5" /> {t("portal.kyc.registration")}
                </RyvoButton>
                <RyvoButton
                  intent="outline"
                  size="sm"
                  onClick={() => {
                    setDocVehicleId(v.id);
                    setDocKind("insurance");
                    insRef.current?.click();
                  }}
                >
                  <Upload className="size-3.5" /> {t("portal.kyc.insurance")}
                </RyvoButton>
                <RyvoButton
                  intent="outline"
                  size="sm"
                  onClick={() => {
                    setDocVehicleId(v.id);
                    bannerRef.current?.click();
                  }}
                >
                  <Upload className="size-3.5" /> {t("portal.kyc.banner")}
                </RyvoButton>
                <RyvoButton intent="danger" size="sm" onClick={() => deleteM.mutate(v.id)}>
                  <Trash2 className="size-3.5" />
                </RyvoButton>
              </div>
              <ul className="mt-3 space-y-1">
                {v.documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between text-xs">
                    <span>
                      {d.doc_type} · {d.status}
                    </span>
                    <button
                      type="button"
                      className="text-primary inline-flex items-center gap-1"
                      onClick={() => setViewDoc({ vehicleId: v.id, docId: d.id })}
                    >
                      <Eye className="size-3" /> {t("drivers.viewDocument")}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <input
        ref={regRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && docVehicleId && docKind === "registration") {
            uploadDocM.mutate({ vehicleId: docVehicleId, docType: "registration", file });
          }
          e.target.value = "";
        }}
      />
      <input
        ref={insRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && docVehicleId && docKind === "insurance") {
            uploadDocM.mutate({ vehicleId: docVehicleId, docType: "insurance", file });
          }
          e.target.value = "";
        }}
      />
      <input
        ref={bannerRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && docVehicleId) uploadBannerM.mutate({ vehicleId: docVehicleId, file });
          e.target.value = "";
        }}
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("portal.kyc.editCar") : t("portal.kyc.addCar")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["make", t("portal.kyc.fields.make")],
                ["model", t("portal.kyc.fields.model")],
                ["brand", t("portal.kyc.fields.brand")],
                ["name", t("portal.kyc.fields.name")],
                ["plate", t("portal.kyc.fields.plate")],
                ["year", t("portal.kyc.fields.year")],
                ["energy_type", t("portal.kyc.fields.energy")],
                ["tyres_type", t("portal.kyc.fields.tyres")],
                ["max_speed_kmh", t("portal.kyc.fields.speed")],
                ["age_years", t("portal.kyc.fields.age")],
                ["carbon_print", t("portal.kyc.fields.carbon")],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                <Input
                  value={String(form[key])}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      [key]:
                        key === "year" || key === "max_speed_kmh" || key === "age_years"
                          ? e.target.value
                          : e.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <RyvoButton intent="cta" disabled={saveM.isPending} onClick={() => saveM.mutate()}>
              {t("common.save")}
            </RyvoButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewDoc)} onOpenChange={(open) => !open && setViewDoc(null)}>
        <DialogContent className="max-w-3xl">
          <div className="bg-muted/30 min-h-[240px] rounded-xl border p-2">
            {viewQ.data?.url && viewQ.data.mime_type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewQ.data.url} alt="" className="max-h-[55vh] w-full object-contain" />
            ) : viewQ.data?.url ? (
              <iframe title="doc" src={viewQ.data.url} className="h-[55vh] w-full" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
