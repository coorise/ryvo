"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Plus, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
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

const MAX_VIDEO_BYTES = 30 * 1024 * 1024;
const MIN_GALLERY_IMAGES = 2;

export const emptyVehicleForm = {
  make: "",
  model: "",
  year: new Date().getFullYear(),
  plate: "",
  color: "",
  category: "economy",
  brand: "",
  name: "",
  energy_type: "fuel",
  tyres_type: "",
  carbon_print: "",
  max_speed_kmh: "",
  age_years: "",
};

export type VehicleFormState = typeof emptyVehicleForm;

function vehicleToForm(v: DriverVehicle): VehicleFormState {
  return {
    make: v.make,
    model: v.model,
    year: v.year,
    plate: v.plate ?? "",
    color: v.color ?? "",
    category: v.category ?? "economy",
    brand: v.brand ?? "",
    name: v.name ?? "",
    energy_type: v.energy_type ?? "fuel",
    tyres_type: v.tyres_type ?? "",
    carbon_print: v.carbon_print != null ? String(v.carbon_print) : "",
    max_speed_kmh: v.max_speed_kmh != null ? String(v.max_speed_kmh) : "",
    age_years: v.age_years != null ? String(v.age_years) : "",
  };
}

function formToBody(form: VehicleFormState): Record<string, unknown> {
  return {
    make: form.make.trim() || "Unknown",
    model: form.model.trim() || "Unknown",
    year: Number(form.year) || new Date().getFullYear(),
    plate: form.plate.trim() || null,
    color: form.color.trim() || null,
    category: form.category.trim() || "economy",
    brand: form.brand.trim() || null,
    name: form.name.trim() || null,
    energy_type: form.energy_type,
    tyres_type: form.tyres_type.trim() || null,
    carbon_print: form.carbon_print ? Number(form.carbon_print) : null,
    max_speed_kmh: form.max_speed_kmh ? Number(form.max_speed_kmh) : null,
    age_years: form.age_years ? Number(form.age_years) : null,
  };
}

type PortalVehicleFormProps = {
  mode: "create" | "edit";
  vehicleId?: string;
};

export function PortalVehicleForm({ mode, vehicleId }: PortalVehicleFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<VehicleFormState>(emptyVehicleForm);
  const [otherLabel, setOtherLabel] = useState("");
  const [viewDoc, setViewDoc] = useState<{ docId: string } | null>(null);
  const [viewMediaKey, setViewMediaKey] = useState<string | null>(null);

  const bannerRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const regRef = useRef<HTMLInputElement>(null);
  const insRef = useRef<HTMLInputElement>(null);
  const otherRef = useRef<HTMLInputElement>(null);

  const [formLoaded, setFormLoaded] = useState(false);

  const vehicleQ = useQuery({
    queryKey: ["portal", "vehicle", vehicleId],
    queryFn: () => vehiclesService.getVehicle(accessToken, vehicleId!),
    enabled: mode === "edit" && Boolean(accessToken && vehicleId),
  });

  const vehicle = vehicleQ.data?.vehicle;

  useEffect(() => {
    if (mode === "edit" && vehicle && !formLoaded) {
      setForm(vehicleToForm(vehicle));
      setFormLoaded(true);
    }
  }, [mode, vehicle, formLoaded]);

  const viewDocQ = useQuery({
    queryKey: ["portal", "vehicle-doc-view", vehicleId, viewDoc?.docId],
    queryFn: () => vehiclesService.getDocumentViewUrl(accessToken, vehicleId!, viewDoc!.docId),
    enabled: Boolean(accessToken && vehicleId && viewDoc),
  });

  const viewMediaQ = useQuery({
    queryKey: ["portal", "vehicle-media-view", vehicleId, viewMediaKey],
    queryFn: () => vehiclesService.getMediaViewUrl(accessToken, vehicleId!, viewMediaKey!),
    enabled: Boolean(accessToken && vehicleId && viewMediaKey),
  });

  const saveM = useMutation({
    mutationFn: async () => {
      const body = formToBody(form);
      if (mode === "create") return vehiclesService.create(accessToken, body);
      if (mode === "edit" && vehicle) {
        const galleryCount = vehicle.image_keys?.length ?? 0;
        if (galleryCount < MIN_GALLERY_IMAGES) {
          throw new Error(t("portal.kyc.minGalleryImages", { count: MIN_GALLERY_IMAGES }));
        }
        if (!vehicle.banner_key) throw new Error(t("portal.kyc.bannerRequired"));
        const hasReg = vehicle.documents.some((d) => d.doc_type === "registration");
        const hasIns = vehicle.documents.some((d) => d.doc_type === "insurance");
        if (!hasReg || !hasIns) throw new Error(t("portal.kyc.docsRequired"));
      }
      return vehiclesService.update(accessToken, vehicleId!, body);
    },
    onSuccess: (data) => {
      toast.success(t("portal.kyc.carSaved"));
      void qc.invalidateQueries({ queryKey: ["portal", "vehicles"] });
      if (mode === "create" && data.vehicle?.id) {
        router.push(`/driver/main/kyc/cars/${data.vehicle.id}/edit`);
      } else {
        void qc.invalidateQueries({ queryKey: ["portal", "vehicle", vehicleId] });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadDocM = useMutation({
    mutationFn: async ({
      docType,
      file,
      label,
    }: {
      docType: string;
      file: File;
      label?: string;
    }) => {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `drivers/${user!.id}/vehicles/${vehicleId}/${docType}/${Date.now()}.${ext}`;
      const s3Key = await storageService.uploadFile(accessToken, file, path);
      return vehiclesService.submitDocument(accessToken, vehicleId!, {
        doc_type: docType,
        s3_key: s3Key,
        label,
      });
    },
    onSuccess: () => {
      toast.success(t("portal.kyc.uploaded"));
      void qc.invalidateQueries({ queryKey: ["portal", "vehicle", vehicleId] });
      void qc.invalidateQueries({ queryKey: ["portal", "vehicles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchMediaM = useMutation({
    mutationFn: async (patch: Record<string, unknown>) =>
      vehiclesService.update(accessToken, vehicleId!, patch),
    onSuccess: () => {
      toast.success(t("portal.kyc.uploaded"));
      void qc.invalidateQueries({ queryKey: ["portal", "vehicle", vehicleId] });
      void qc.invalidateQueries({ queryKey: ["portal", "vehicles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function uploadGalleryFiles(files: FileList | null) {
    if (!files?.length || !vehicleId || !vehicle) return;
    const keys = [...(vehicle.image_keys ?? [])];
    for (const file of Array.from(files)) {
      const path = `drivers/${user!.id}/vehicles/${vehicleId}/gallery/${Date.now()}-${file.name}`;
      const key = await storageService.uploadFile(accessToken, file, path);
      keys.push(key);
    }
    await patchMediaM.mutateAsync({ image_keys: keys });
  }

  async function uploadVideo(file: File) {
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error(t("portal.kyc.videoTooLarge"));
      return;
    }
    const path = `drivers/${user!.id}/vehicles/${vehicleId}/video/${Date.now()}.mp4`;
    const key = await storageService.uploadFile(accessToken, file, path);
    await patchMediaM.mutateAsync({ video_key: key });
  }

  const fieldRows: { key: keyof VehicleFormState; label: string; type?: string }[] = [
    { key: "brand", label: t("portal.kyc.fields.brand") },
    { key: "name", label: t("portal.kyc.fields.name") },
    { key: "make", label: t("portal.kyc.fields.make") },
    { key: "model", label: t("portal.kyc.fields.model") },
    { key: "plate", label: t("portal.kyc.fields.plate") },
    { key: "year", label: t("portal.kyc.fields.year"), type: "number" },
    { key: "color", label: t("portal.kyc.fields.color") },
    { key: "category", label: t("portal.kyc.fields.category") },
    { key: "tyres_type", label: t("portal.kyc.fields.tyres") },
    { key: "max_speed_kmh", label: t("portal.kyc.fields.speed"), type: "number" },
    { key: "age_years", label: t("portal.kyc.fields.age"), type: "number" },
    { key: "carbon_print", label: t("portal.kyc.fields.carbon"), type: "number" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fieldRows.map(({ key, label, type }) => (
          <div key={key} className="space-y-1">
            <Label>{label}</Label>
            <Input
              type={type ?? "text"}
              value={String(form[key])}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  [key]: type === "number" ? e.target.value : e.target.value,
                }))
              }
            />
          </div>
        ))}
        <div className="space-y-1">
          <Label>{t("portal.kyc.fields.energy")}</Label>
          <select
            className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
            value={form.energy_type}
            onChange={(e) => setForm((f) => ({ ...f, energy_type: e.target.value }))}
          >
            <option value="fuel">{t("portal.kyc.energy.fuel")}</option>
            <option value="electric">{t("portal.kyc.energy.electric")}</option>
            <option value="hybrid">{t("portal.kyc.energy.hybrid")}</option>
          </select>
        </div>
      </div>

      {mode === "edit" && vehicle ? (
        <>
          <section className="border-border space-y-3 rounded-2xl border p-4">
            <p className="font-semibold">{t("portal.kyc.mediaSection")}</p>
            <p className="text-muted-foreground text-xs">{t("portal.kyc.mediaHint")}</p>
            <div className="flex flex-wrap gap-2">
              <RyvoButton intent="outline" size="sm" onClick={() => bannerRef.current?.click()}>
                <Upload className="size-3.5" /> {t("portal.kyc.banner")}
                {vehicle.banner_key ? " ✓" : ""}
              </RyvoButton>
              <RyvoButton intent="outline" size="sm" onClick={() => galleryRef.current?.click()}>
                <Upload className="size-3.5" /> {t("portal.kyc.addGalleryImages")} (
                {vehicle.image_keys?.length ?? 0}/{MIN_GALLERY_IMAGES}+)
              </RyvoButton>
              <RyvoButton intent="outline" size="sm" onClick={() => videoRef.current?.click()}>
                <Upload className="size-3.5" /> {t("portal.kyc.video")}
                {vehicle.video_key ? " ✓" : ""}
              </RyvoButton>
              {vehicle.banner_key ? (
                <RyvoButton
                  intent="outline"
                  size="sm"
                  onClick={() => setViewMediaKey(vehicle.banner_key!)}
                >
                  <Eye className="size-3.5" /> {t("portal.kyc.viewBanner")}
                </RyvoButton>
              ) : null}
              {(vehicle.image_keys ?? []).map((key, i) => (
                <RyvoButton key={key} intent="outline" size="sm" onClick={() => setViewMediaKey(key)}>
                  <Eye className="size-3.5" /> {t("portal.kyc.galleryImage")} {i + 1}
                </RyvoButton>
              ))}
              {vehicle.video_key ? (
                <RyvoButton
                  intent="outline"
                  size="sm"
                  onClick={() => setViewMediaKey(vehicle.video_key!)}
                >
                  <Eye className="size-3.5" /> {t("portal.kyc.viewVideo")}
                </RyvoButton>
              ) : null}
            </div>
          </section>

          <section className="border-border space-y-3 rounded-2xl border p-4">
            <p className="font-semibold">{t("portal.kyc.documentsSection")}</p>
            <div className="flex flex-wrap gap-2">
              <RyvoButton intent="outline" size="sm" onClick={() => regRef.current?.click()}>
                <Upload className="size-3.5" /> {t("portal.kyc.registration")}
              </RyvoButton>
              <RyvoButton intent="outline" size="sm" onClick={() => insRef.current?.click()}>
                <Upload className="size-3.5" /> {t("portal.kyc.insurance")}
              </RyvoButton>
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t("portal.kyc.otherDocLabel")}</Label>
                  <Input
                    value={otherLabel}
                    onChange={(e) => setOtherLabel(e.target.value)}
                    placeholder={t("portal.kyc.otherDocPlaceholder")}
                    className="h-9 w-40"
                  />
                </div>
                <RyvoButton intent="outline" size="sm" onClick={() => otherRef.current?.click()}>
                  <Plus className="size-3.5" /> {t("portal.kyc.addOtherDoc")}
                </RyvoButton>
              </div>
            </div>
            <ul className="space-y-1 text-xs">
              {vehicle.documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2">
                  <span>
                    {d.doc_type === "other" && d.label ? d.label : d.doc_type} · {d.status}
                  </span>
                  <button
                    type="button"
                    className="text-primary inline-flex items-center gap-1"
                    onClick={() => setViewDoc({ docId: d.id })}
                  >
                    <Eye className="size-3" /> {t("portal.kyc.viewDocument")}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {vehicle.status === KYC_STATUS.rejected && vehicle.rejection_reason ? (
            <p className="text-destructive text-sm">{vehicle.rejection_reason}</p>
          ) : null}
        </>
      ) : mode === "create" ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
          {t("portal.kyc.createThenUploadHint")}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <RyvoButton intent="cta" disabled={saveM.isPending} onClick={() => saveM.mutate()}>
          {mode === "create" ? t("portal.kyc.createCar") : t("common.save")}
        </RyvoButton>
        {vehicleId ? (
          <Link href={`/driver/main/kyc/cars/${vehicleId}`}>
            <RyvoButton intent="outline">{t("portal.kyc.viewCar")}</RyvoButton>
          </Link>
        ) : null}
        <Link href="/driver/main/kyc?tab=cars">
          <RyvoButton intent="outline">{t("portal.kyc.backToCars")}</RyvoButton>
        </Link>
      </div>

      <input
        ref={bannerRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file && vehicleId) {
            const path = `drivers/${user!.id}/vehicles/${vehicleId}/banner/${Date.now()}.jpg`;
            const key = await storageService.uploadFile(accessToken, file, path);
            await patchMediaM.mutateAsync({ banner_key: key });
          }
          e.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void uploadGalleryFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/mp4,video/webm"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadVideo(file);
          e.target.value = "";
        }}
      />
      <input
        ref={regRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadDocM.mutate({ docType: "registration", file });
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
          if (file) uploadDocM.mutate({ docType: "insurance", file });
          e.target.value = "";
        }}
      />
      <input
        ref={otherRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file)
            uploadDocM.mutate({
              docType: "other",
              file,
              label: otherLabel.trim() || t("portal.kyc.otherDocDefault"),
            });
          e.target.value = "";
        }}
      />

      <Dialog open={Boolean(viewDoc)} onOpenChange={(open) => !open && setViewDoc(null)}>
        <DialogContent className="max-w-3xl">
          <div className="bg-muted/30 min-h-[240px] rounded-xl border p-2">
            {viewDocQ.data?.url && viewDocQ.data.mime_type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewDocQ.data.url} alt="" className="max-h-[55vh] w-full object-contain" />
            ) : viewDocQ.data?.url ? (
              <iframe title="doc" src={viewDocQ.data.url} className="h-[55vh] w-full" />
            ) : null}
          </div>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewMediaKey)} onOpenChange={(open) => !open && setViewMediaKey(null)}>
        <DialogContent className="max-w-3xl">
          <div className="bg-muted/30 min-h-[240px] rounded-xl border p-2">
            {viewMediaQ.data?.url && viewMediaQ.data.mime_type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewMediaQ.data.url} alt="" className="max-h-[55vh] w-full object-contain" />
            ) : viewMediaQ.data?.url && viewMediaQ.data.mime_type.startsWith("video/") ? (
              <video src={viewMediaQ.data.url} controls className="max-h-[55vh] w-full" />
            ) : null}
          </div>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  );
}
