"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Eye, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import {
  buildVehicleChecklist,
  emptyVehicleForm,
  ENERGY_TYPES,
  formToBody,
  MIN_GALLERY_IMAGES,
  TYRES_TYPES,
  validateVideoFile,
  vehicleToForm,
  type VehicleFormState,
} from "@/lib/vehicle-profile";
import { storageService } from "@/services/storage.service";
import { vehiclesService, type DriverVehicle } from "@/services/vehicles.service";
import { cn } from "@/lib/utils";
import { isRealStorageKey } from "@/lib/storage-keys";

type PortalVehicleFormProps = {
  mode: "create" | "edit";
  vehicleId?: string;
};

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {done ? (
        <CheckCircle2 className="text-primary mt-0.5 size-4 shrink-0" />
      ) : (
        <Circle className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      )}
      <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}

function validateProfileForm(form: VehicleFormState, t: (k: string) => string) {
  if (!form.brand.trim() || !form.name.trim()) throw new Error(t("portal.kyc.requiredBrandName"));
  if (!form.plate.trim()) throw new Error(t("portal.kyc.requiredPlate"));
  if (!form.max_speed_kmh) throw new Error(t("portal.kyc.requiredSpeed"));
  if (!form.age_years) throw new Error(t("portal.kyc.requiredAge"));
  if (!form.tyres_type) throw new Error(t("portal.kyc.requiredTyres"));
  if (!form.carbon_print) throw new Error(t("portal.kyc.requiredCarbon"));
}

export function PortalVehicleForm({ mode, vehicleId }: PortalVehicleFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<VehicleFormState>(emptyVehicleForm);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [formLoaded, setFormLoaded] = useState(false);
  const [otherLabel, setOtherLabel] = useState("");
  const [viewDocId, setViewDocId] = useState<string | null>(null);
  const [viewMediaKey, setViewMediaKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const effectiveId = vehicleId ?? savedId;

  const vehicleQ = useQuery({
    queryKey: ["portal", "vehicle", effectiveId],
    queryFn: () => vehiclesService.getVehicle(accessToken, effectiveId!),
    enabled: Boolean(accessToken && effectiveId),
  });

  const vehicle = vehicleQ.data?.vehicle;

  useEffect(() => {
    if (vehicle && !formLoaded) {
      setForm(vehicleToForm(vehicle));
      setFormLoaded(true);
    }
  }, [vehicle, formLoaded]);

  const checklist = buildVehicleChecklist(form, vehicle);

  const viewDocQ = useQuery({
    queryKey: ["portal", "vehicle-doc-view", effectiveId, viewDocId],
    queryFn: () => vehiclesService.getDocumentViewUrl(accessToken, effectiveId!, viewDocId!),
    enabled: Boolean(accessToken && effectiveId && viewDocId),
  });

  const viewMediaQ = useQuery({
    queryKey: ["portal", "vehicle-media-view", effectiveId, viewMediaKey],
    queryFn: () => vehiclesService.getMediaViewUrl(accessToken, effectiveId!, viewMediaKey!),
    enabled: Boolean(accessToken && effectiveId && viewMediaKey),
  });

  async function persistVehicle(): Promise<DriverVehicle> {
    validateProfileForm(form, t);
    const body = formToBody(form);
    if (effectiveId) {
      const res = await vehiclesService.update(accessToken, effectiveId, body);
      void qc.invalidateQueries({ queryKey: ["portal", "vehicle", effectiveId] });
      return res.vehicle;
    }
    const res = await vehiclesService.create(accessToken, body);
    setSavedId(res.vehicle.id);
    router.replace(`/driver/main/kyc/cars/${res.vehicle.id}/edit`, { scroll: false });
    void qc.invalidateQueries({ queryKey: ["portal", "vehicle", res.vehicle.id] });
    void qc.invalidateQueries({ queryKey: ["portal", "vehicles"] });
    return res.vehicle;
  }

  const saveM = useMutation({
    mutationFn: async (strict?: boolean) => {
      const v = await persistVehicle();
      if (strict) {
        const c = buildVehicleChecklist(form, v);
        if (!c.readyForReview) throw new Error(t("portal.kyc.profileIncomplete"));
      }
      return v;
    },
    onSuccess: () => toast.success(t("portal.kyc.carSaved")),
    onError: (e: Error) => toast.error(e.message),
  });

  async function withVehicle(run: (v: DriverVehicle, id: string) => Promise<void>) {
    setBusy(true);
    try {
      const v = await persistVehicle();
      const id = v.id;
      await run(v, id);
      void qc.invalidateQueries({ queryKey: ["portal", "vehicle", id] });
      void qc.invalidateQueries({ queryKey: ["portal", "vehicles"] });
      toast.success(t("portal.kyc.uploaded"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadBanner(file: File) {
    await withVehicle(async (_v, id) => {
      const path = `drivers/${user!.id}/vehicles/${id}/banner/${Date.now()}.jpg`;
      const key = await storageService.uploadFile(accessToken, file, path);
      await vehiclesService.update(accessToken, id, { banner_key: key });
    });
  }

  async function uploadGallery(files: FileList | null) {
    if (!files?.length) return;
    await withVehicle(async (v, id) => {
      const keys = [...(v.image_keys ?? [])];
      for (const file of Array.from(files)) {
        const path = `drivers/${user!.id}/vehicles/${id}/gallery/${Date.now()}-${file.name}`;
        keys.push(await storageService.uploadFile(accessToken, file, path));
      }
      await vehiclesService.update(accessToken, id, { image_keys: keys });
    });
  }

  async function uploadVideo(file: File) {
    const check = await validateVideoFile(file);
    if (!check.ok) {
      if (check.reason === "size") toast.error(t("portal.kyc.videoTooLarge"));
      else if (check.reason === "duration") toast.error(t("portal.kyc.videoTooLong"));
      else toast.error(t("portal.kyc.videoInvalid"));
      return;
    }
    await withVehicle(async (_v, id) => {
      const path = `drivers/${user!.id}/vehicles/${id}/video/${Date.now()}.mp4`;
      const key = await storageService.uploadFile(accessToken, file, path);
      await vehiclesService.update(accessToken, id, { video_key: key });
    });
  }

  async function uploadDoc(docType: string, file: File, label?: string) {
    await withVehicle(async (_v, id) => {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `drivers/${user!.id}/vehicles/${id}/${docType}/${Date.now()}.${ext}`;
      const s3Key = await storageService.uploadFile(accessToken, file, path);
      await vehiclesService.submitDocument(accessToken, id, { doc_type: docType, s3_key: s3Key, label });
    });
  }

  async function removeGalleryKey(key: string) {
    if (!vehicle || !effectiveId) return;
    setBusy(true);
    try {
      const keys = (vehicle.image_keys ?? []).filter((k) => k !== key);
      await vehiclesService.update(accessToken, effectiveId, { image_keys: keys });
      void qc.invalidateQueries({ queryKey: ["portal", "vehicle", effectiveId] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function docForType(docType: string) {
    const doc = vehicle?.documents.find((d) => d.doc_type === docType);
    if (!doc || !isRealStorageKey(doc.s3_key)) return undefined;
    return doc;
  }

  const otherDocs = vehicle?.documents.filter((d) => d.doc_type === "other") ?? [];
  const galleryCount = (vehicle?.image_keys ?? []).filter(isRealStorageKey).length;

  const fileInputClass =
    "border-input bg-background file:text-foreground file:border-0 file:bg-muted file:mr-3 file:rounded-md file:px-3 file:py-1 file:text-sm h-10 w-full rounded-md border px-3 py-1.5 text-sm";

  return (
    <div className="space-y-8">
      <section className="border-border bg-muted/20 rounded-2xl border p-4">
        <p className="mb-3 font-semibold">{t("portal.kyc.profileChecklist")}</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          <CheckItem done={checklist.profileComplete} label={t("portal.kyc.checkProfileFields")} />
          <CheckItem done={checklist.hasBanner} label={t("portal.kyc.banner")} />
          <CheckItem
            done={checklist.galleryCount >= MIN_GALLERY_IMAGES}
            label={t("portal.kyc.checkGallery", { count: MIN_GALLERY_IMAGES })}
          />
          <CheckItem done={checklist.hasRegistration} label={t("portal.kyc.registration")} />
          <CheckItem done={checklist.hasInsurance} label={t("portal.kyc.insurance")} />
          <CheckItem done={Boolean(vehicle?.video_key)} label={t("portal.kyc.videoOptional")} />
        </ul>
      </section>

      <section className="border-border space-y-4 rounded-2xl border p-4">
        <div>
          <p className="text-lg font-bold">{t("portal.kyc.carProfileSection")}</p>
          <p className="text-muted-foreground text-sm">{t("portal.kyc.carProfileHint")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["brand", t("portal.kyc.fields.brand")],
              ["name", t("portal.kyc.fields.name")],
              ["plate", t("portal.kyc.fields.plate")],
              ["max_speed_kmh", t("portal.kyc.fields.speed"), "number"],
              ["age_years", t("portal.kyc.fields.age"), "number"],
              ["carbon_print", t("portal.kyc.fields.carbon"), "number"],
            ] as const
          ).map(([key, label, type]) => (
            <div key={key} className="space-y-1">
              <Label>{label} *</Label>
              <Input
                type={type ?? "text"}
                min={type === "number" ? 0 : undefined}
                step={key === "carbon_print" ? "0.01" : undefined}
                value={String(form[key])}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    [key]: e.target.value,
                    ...(key === "brand" ? { make: e.target.value } : {}),
                    ...(key === "name" ? { model: e.target.value } : {}),
                  }))
                }
              />
            </div>
          ))}
          <div className="space-y-1">
            <Label>{t("portal.kyc.fields.tyres")} *</Label>
            <select
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
              value={form.tyres_type}
              onChange={(e) => setForm((f) => ({ ...f, tyres_type: e.target.value }))}
            >
              <option value="">{t("portal.kyc.selectTyres")}</option>
              {TYRES_TYPES.map((tyre) => (
                <option key={tyre} value={tyre}>
                  {t(`portal.kyc.tyres.${tyre}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>{t("portal.kyc.fields.energy")} *</Label>
            <select
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
              value={form.energy_type}
              onChange={(e) => setForm((f) => ({ ...f, energy_type: e.target.value }))}
            >
              {ENERGY_TYPES.map((energy) => (
                <option key={energy} value={energy}>
                  {t(`portal.kyc.energy.${energy}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="border-border space-y-4 rounded-2xl border p-4">
        <div>
          <p className="font-semibold">{t("portal.kyc.mediaSection")}</p>
          <p className="text-muted-foreground text-xs">{t("portal.kyc.mediaHint")}</p>
        </div>

        <div className="space-y-1">
          <Label>{t("portal.kyc.banner")} *</Label>
          <Input
            type="file"
            accept="image/*"
            disabled={busy}
            className={fileInputClass}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadBanner(file);
              e.target.value = "";
            }}
          />
          {vehicle?.banner_key && isRealStorageKey(vehicle.banner_key) ? (
            <RyvoButton intent="outline" size="sm" className="mt-2" onClick={() => setViewMediaKey(vehicle.banner_key!)}>
              <Eye className="size-3.5" /> {t("portal.kyc.viewBanner")}
            </RyvoButton>
          ) : null}
        </div>

        <div className="space-y-1">
          <Label>
            {t("portal.kyc.galleryImages")} * ({galleryCount}/{MIN_GALLERY_IMAGES}+)
          </Label>
          <Input
            type="file"
            accept="image/*"
            multiple
            disabled={busy}
            className={fileInputClass}
            onChange={(e) => {
              void uploadGallery(e.target.files);
              e.target.value = "";
            }}
          />
          {(vehicle?.image_keys ?? []).filter(isRealStorageKey).length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {(vehicle?.image_keys ?? []).filter(isRealStorageKey).map((key, i) => (
                <div key={key} className="border-border flex items-center gap-1 rounded-lg border px-2 py-1 text-xs">
                  <button type="button" className="text-primary" onClick={() => setViewMediaKey(key)}>
                    {t("portal.kyc.galleryImage")} {i + 1}
                  </button>
                  <button type="button" className="text-destructive" onClick={() => void removeGalleryKey(key)}>
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-1">
          <Label>{t("portal.kyc.video")}</Label>
          <Input
            type="file"
            accept="video/mp4,video/webm"
            disabled={busy}
            className={fileInputClass}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadVideo(file);
              e.target.value = "";
            }}
          />
          {vehicle?.video_key && isRealStorageKey(vehicle.video_key) ? (
            <RyvoButton intent="outline" size="sm" className="mt-2" onClick={() => setViewMediaKey(vehicle.video_key!)}>
              <Eye className="size-3.5" /> {t("portal.kyc.viewVideo")}
            </RyvoButton>
          ) : null}
        </div>
      </section>

      <section className="border-border space-y-4 rounded-2xl border p-4">
        <div>
          <p className="font-semibold">{t("portal.kyc.documentsSection")}</p>
          <p className="text-muted-foreground text-xs">{t("portal.kyc.documentsHint")}</p>
        </div>

        {(["registration", "insurance"] as const).map((docType) => {
          const doc = vehicle?.documents.find((d) => d.doc_type === docType);
          const hasFile = isRealStorageKey(doc?.s3_key);
          const displayStatus = hasFile ? (doc?.status ?? KYC_STATUS.pending) : "missing";
          return (
            <div key={docType} className="space-y-2 rounded-xl border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {docType === "registration" ? t("portal.kyc.registration") : t("portal.kyc.insurance")} *
                  </p>
                  <span
                    className={cn(
                      "mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                      displayStatus === KYC_STATUS.approved
                        ? "bg-primary/15 text-primary"
                        : displayStatus === "missing"
                          ? "bg-muted text-muted-foreground"
                          : "bg-amber-500/15 text-amber-700",
                    )}
                  >
                    {displayStatus === "missing" ? t("portal.kyc.docMissing") : displayStatus}
                  </span>
                </div>
                {hasFile && doc ? (
                  <RyvoButton intent="outline" size="sm" onClick={() => setViewDocId(doc.id)}>
                    <Eye className="size-3.5" /> {t("portal.kyc.viewDocument")}
                  </RyvoButton>
                ) : null}
              </div>
              <Input
                type="file"
                accept="image/*,application/pdf"
                disabled={busy}
                className={fileInputClass}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadDoc(docType, file);
                  e.target.value = "";
                }}
              />
            </div>
          );
        })}

        <div className="space-y-2 rounded-xl border p-3">
          <p className="font-medium">{t("portal.kyc.otherDocsTitle")}</p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">{t("portal.kyc.otherDocLabel")}</Label>
              <Input
                value={otherLabel}
                onChange={(e) => setOtherLabel(e.target.value)}
                placeholder={t("portal.kyc.otherDocPlaceholder")}
                className="h-9 w-48"
              />
            </div>
          </div>
          <Input
            type="file"
            accept="image/*,application/pdf"
            disabled={busy}
            className={fileInputClass}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file)
                void uploadDoc("other", file, otherLabel.trim() || t("portal.kyc.otherDocDefault"));
              e.target.value = "";
            }}
          />
          <ul className="space-y-2">
            {otherDocs.filter((d) => isRealStorageKey(d.s3_key)).map((d) => (
              <li
                key={d.id}
                className="border-border flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <span>
                  {d.label ?? t("portal.kyc.otherDocDefault")} · {d.status}
                </span>
                <RyvoButton intent="outline" size="sm" onClick={() => setViewDocId(d.id)}>
                  <Eye className="size-3.5" /> {t("portal.kyc.viewDocument")}
                </RyvoButton>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {vehicle?.status === KYC_STATUS.rejected && vehicle.rejection_reason ? (
        <p className="text-destructive text-sm">{vehicle.rejection_reason}</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <RyvoButton intent="cta" disabled={saveM.isPending || busy} onClick={() => saveM.mutate(false)}>
          {t("portal.kyc.saveProfile")}
        </RyvoButton>
        <RyvoButton
          intent="outline"
          disabled={saveM.isPending || busy || !checklist.readyForReview}
          onClick={() => saveM.mutate(true)}
        >
          {t("portal.kyc.submitForReview")}
        </RyvoButton>
        {effectiveId ? (
          <Link href={`/driver/main/kyc/cars/${effectiveId}`}>
            <RyvoButton intent="outline">{t("portal.kyc.viewCar")}</RyvoButton>
          </Link>
        ) : null}
        <Link href="/driver/main/kyc?tab=cars">
          <RyvoButton intent="outline">{t("portal.kyc.backToCars")}</RyvoButton>
        </Link>
      </div>

      <Dialog open={Boolean(viewDocId)} onOpenChange={(open) => !open && setViewDocId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("portal.kyc.viewDocument")}</DialogTitle>
          </DialogHeader>
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
