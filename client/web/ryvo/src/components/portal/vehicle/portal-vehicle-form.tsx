"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Eye, Plus, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
import { vehiclesService } from "@/services/vehicles.service";
import { cn } from "@/lib/utils";

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

  const effectiveId = vehicleId ?? savedId;
  const isPersisted = Boolean(effectiveId);

  const bannerRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const regRef = useRef<HTMLInputElement>(null);
  const insRef = useRef<HTMLInputElement>(null);
  const otherRef = useRef<HTMLInputElement>(null);

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

  const saveM = useMutation({
    mutationFn: async (strict?: boolean) => {
      if (!form.brand.trim() || !form.name.trim()) {
        throw new Error(t("portal.kyc.requiredBrandName"));
      }
      if (!form.plate.trim()) throw new Error(t("portal.kyc.requiredPlate"));
      const body = formToBody(form);
      if (!effectiveId) return vehiclesService.create(accessToken, body);
      if (strict && vehicle) {
        const c = buildVehicleChecklist(form, vehicle);
        if (!c.readyForReview) throw new Error(t("portal.kyc.profileIncomplete"));
      }
      return vehiclesService.update(accessToken, effectiveId, body);
    },
    onSuccess: (data) => {
      toast.success(t("portal.kyc.carSaved"));
      void qc.invalidateQueries({ queryKey: ["portal", "vehicles"] });
      const id = data.vehicle?.id ?? effectiveId;
      if (!effectiveId && id) {
        setSavedId(id);
        router.replace(`/driver/main/kyc/cars/${id}/edit`, { scroll: false });
      } else {
        void qc.invalidateQueries({ queryKey: ["portal", "vehicle", effectiveId] });
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
      const path = `drivers/${user!.id}/vehicles/${effectiveId}/${docType}/${Date.now()}.${ext}`;
      const s3Key = await storageService.uploadFile(accessToken, file, path);
      return vehiclesService.submitDocument(accessToken, effectiveId!, {
        doc_type: docType,
        s3_key: s3Key,
        label,
      });
    },
    onSuccess: () => {
      toast.success(t("portal.kyc.uploaded"));
      void qc.invalidateQueries({ queryKey: ["portal", "vehicle", effectiveId] });
      void qc.invalidateQueries({ queryKey: ["portal", "vehicles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchMediaM = useMutation({
    mutationFn: async (patch: Record<string, unknown>) =>
      vehiclesService.update(accessToken, effectiveId!, patch),
    onSuccess: () => {
      toast.success(t("portal.kyc.uploaded"));
      void qc.invalidateQueries({ queryKey: ["portal", "vehicle", effectiveId] });
      void qc.invalidateQueries({ queryKey: ["portal", "vehicles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function uploadGalleryFiles(files: FileList | null) {
    if (!files?.length || !effectiveId || !vehicle) return;
    const keys = [...(vehicle.image_keys ?? [])];
    for (const file of Array.from(files)) {
      const path = `drivers/${user!.id}/vehicles/${effectiveId}/gallery/${Date.now()}-${file.name}`;
      keys.push(await storageService.uploadFile(accessToken, file, path));
    }
    await patchMediaM.mutateAsync({ image_keys: keys });
  }

  async function removeGalleryKey(key: string) {
    if (!vehicle) return;
    const keys = (vehicle.image_keys ?? []).filter((k) => k !== key);
    await patchMediaM.mutateAsync({ image_keys: keys });
  }

  async function uploadVideo(file: File) {
    const check = await validateVideoFile(file);
    if (!check.ok) {
      if (check.reason === "size") toast.error(t("portal.kyc.videoTooLarge"));
      else if (check.reason === "duration") toast.error(t("portal.kyc.videoTooLong"));
      else toast.error(t("portal.kyc.videoInvalid"));
      return;
    }
    const path = `drivers/${user!.id}/vehicles/${effectiveId}/video/${Date.now()}.mp4`;
    const key = await storageService.uploadFile(accessToken, file, path);
    await patchMediaM.mutateAsync({ video_key: key });
  }

  function docForType(docType: string) {
    return vehicle?.documents.find((d) => d.doc_type === docType);
  }

  const otherDocs = vehicle?.documents.filter((d) => d.doc_type === "other") ?? [];

  return (
    <div className="space-y-8">
      {isPersisted && vehicle ? (
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
            <CheckItem done={Boolean(vehicle.video_key)} label={t("portal.kyc.videoOptional")} />
          </ul>
        </section>
      ) : null}

      <section className="space-y-4">
        <div>
          <p className="text-lg font-bold">{t("portal.kyc.carProfileSection")}</p>
          <p className="text-muted-foreground text-sm">{t("portal.kyc.carProfileHint")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label>{t("portal.kyc.fields.brand")} *</Label>
            <Input
              value={form.brand}
              onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value, make: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("portal.kyc.fields.name")} *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, model: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("portal.kyc.fields.plate")} *</Label>
            <Input value={form.plate} onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>{t("portal.kyc.fields.speed")} *</Label>
            <Input
              type="number"
              min={0}
              value={form.max_speed_kmh}
              onChange={(e) => setForm((f) => ({ ...f, max_speed_kmh: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("portal.kyc.fields.age")} *</Label>
            <Input
              type="number"
              min={0}
              value={form.age_years}
              onChange={(e) => setForm((f) => ({ ...f, age_years: e.target.value }))}
            />
          </div>
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
            <Label>{t("portal.kyc.fields.carbon")} *</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.carbon_print}
              onChange={(e) => setForm((f) => ({ ...f, carbon_print: e.target.value }))}
            />
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

      {isPersisted && vehicle ? (
        <>
          <section className="border-border space-y-4 rounded-2xl border p-4">
            <div>
              <p className="font-semibold">{t("portal.kyc.mediaSection")}</p>
              <p className="text-muted-foreground text-xs">{t("portal.kyc.mediaHint")}</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">{t("portal.kyc.banner")} *</p>
              <div className="flex flex-wrap items-center gap-2">
                <RyvoButton intent="outline" size="sm" onClick={() => bannerRef.current?.click()}>
                  <Upload className="size-3.5" /> {t("portal.kyc.uploadBanner")}
                </RyvoButton>
                {vehicle.banner_key ? (
                  <RyvoButton intent="outline" size="sm" onClick={() => setViewMediaKey(vehicle.banner_key!)}>
                    <Eye className="size-3.5" /> {t("portal.kyc.viewBanner")}
                  </RyvoButton>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">
                {t("portal.kyc.galleryImages")} * ({vehicle.image_keys?.length ?? 0}/{MIN_GALLERY_IMAGES}+)
              </p>
              <RyvoButton intent="outline" size="sm" onClick={() => galleryRef.current?.click()}>
                <Upload className="size-3.5" /> {t("portal.kyc.addGalleryImages")}
              </RyvoButton>
              {(vehicle.image_keys ?? []).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {(vehicle.image_keys ?? []).map((key, i) => (
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

            <div className="space-y-3">
              <p className="text-sm font-medium">{t("portal.kyc.video")}</p>
              <div className="flex flex-wrap gap-2">
                <RyvoButton intent="outline" size="sm" onClick={() => videoRef.current?.click()}>
                  <Upload className="size-3.5" /> {t("portal.kyc.uploadVideo")}
                </RyvoButton>
                {vehicle.video_key ? (
                  <RyvoButton intent="outline" size="sm" onClick={() => setViewMediaKey(vehicle.video_key!)}>
                    <Eye className="size-3.5" /> {t("portal.kyc.viewVideo")}
                  </RyvoButton>
                ) : null}
              </div>
            </div>
          </section>

          <section className="border-border space-y-4 rounded-2xl border p-4">
            <div>
              <p className="font-semibold">{t("portal.kyc.documentsSection")}</p>
              <p className="text-muted-foreground text-xs">{t("portal.kyc.documentsHint")}</p>
            </div>

            {(["registration", "insurance"] as const).map((docType) => {
              const doc = docForType(docType);
              return (
                <div
                  key={docType}
                  className="border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {docType === "registration"
                        ? t("portal.kyc.registration")
                        : t("portal.kyc.insurance")}
                      {" *"}
                    </p>
                    <span
                      className={cn(
                        "mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                        doc?.status === KYC_STATUS.approved
                          ? "bg-primary/15 text-primary"
                          : doc
                            ? "bg-amber-500/15 text-amber-700"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {doc?.status ?? t("portal.kyc.docMissing")}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <RyvoButton
                      intent="outline"
                      size="sm"
                      onClick={() =>
                        docType === "registration"
                          ? regRef.current?.click()
                          : insRef.current?.click()
                      }
                    >
                      <Upload className="size-3.5" /> {doc ? t("portal.kyc.update") : t("portal.kyc.upload")}
                    </RyvoButton>
                    {doc ? (
                      <RyvoButton intent="outline" size="sm" onClick={() => setViewDocId(doc.id)}>
                        <Eye className="size-3.5" /> {t("portal.kyc.viewDocument")}
                      </RyvoButton>
                    ) : null}
                  </div>
                </div>
              );
            })}

            <div className="space-y-2">
              <p className="text-sm font-medium">{t("portal.kyc.otherDocsTitle")}</p>
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
                <RyvoButton intent="outline" size="sm" onClick={() => otherRef.current?.click()}>
                  <Plus className="size-3.5" /> {t("portal.kyc.addOtherDoc")}
                </RyvoButton>
              </div>
              <ul className="space-y-2">
                {otherDocs.map((d) => (
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

          {vehicle.status === KYC_STATUS.rejected && vehicle.rejection_reason ? (
            <p className="text-destructive text-sm">{vehicle.rejection_reason}</p>
          ) : null}
        </>
      ) : (
        <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
          {t("portal.kyc.saveProfileFirstHint")}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <RyvoButton intent="cta" disabled={saveM.isPending} onClick={() => saveM.mutate(false)}>
          {isPersisted ? t("portal.kyc.saveProfile") : t("portal.kyc.createCar")}
        </RyvoButton>
        {isPersisted ? (
          <RyvoButton
            intent="outline"
            disabled={saveM.isPending || !checklist.readyForReview}
            onClick={() => saveM.mutate(true)}
          >
            {t("portal.kyc.submitForReview")}
          </RyvoButton>
        ) : null}
        {effectiveId ? (
          <Link href={`/driver/main/kyc/cars/${effectiveId}`}>
            <RyvoButton intent="outline">{t("portal.kyc.viewCar")}</RyvoButton>
          </Link>
        ) : null}
        <Link href="/driver/main/kyc?tab=cars">
          <RyvoButton intent="outline">{t("portal.kyc.backToCars")}</RyvoButton>
        </Link>
      </div>

      <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
        const file = e.target.files?.[0];
        if (file && effectiveId) {
          const path = `drivers/${user!.id}/vehicles/${effectiveId}/banner/${Date.now()}.jpg`;
          await patchMediaM.mutateAsync({ banner_key: await storageService.uploadFile(accessToken, file, path) });
        }
        e.target.value = "";
      }} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
        void uploadGalleryFiles(e.target.files);
        e.target.value = "";
      }} />
      <input ref={videoRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) void uploadVideo(file);
        e.target.value = "";
      }} />
      <input ref={regRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) uploadDocM.mutate({ docType: "registration", file });
        e.target.value = "";
      }} />
      <input ref={insRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) uploadDocM.mutate({ docType: "insurance", file });
        e.target.value = "";
      }} />
      <input ref={otherRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file)
          uploadDocM.mutate({
            docType: "other",
            file,
            label: otherLabel.trim() || t("portal.kyc.otherDocDefault"),
          });
        e.target.value = "";
      }} />

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
