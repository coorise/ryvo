"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PermissionGate } from "@/guards/permission-gate";
import { useRbac } from "@/hooks/use-rbac";
import { useAuth } from "@/hooks/use-auth";
import { rbacService, type RbacMatrix, type RoleRow } from "@/services/rbac.service";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { cn } from "@/lib/utils";

type PermissionMatrixProps = {
  matrix: RbacMatrix;
  onSaved?: () => void;
  /** Pre-select role from URL (?role=uuid) */
  initialRoleId?: string | null;
};

export function PermissionMatrix({ matrix, onSaved, initialRoleId }: PermissionMatrixProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const { hasPermission, permissions: actorPerms, roles: actorRoles } = useRbac();

  const editableRoles = useMemo(
    () => matrix.roles.filter((r) => r.name !== "super_admin"),
    [matrix.roles],
  );

  const [roleId, setRoleId] = useState(editableRoles[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  const selectedRole = editableRoles.find((r) => r.id === roleId) ?? editableRoles[0];

  const rolePerms = useMemo(() => new Set(selectedRole?.permissions ?? []), [selectedRole]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(rolePerms));

  useEffect(() => {
    setSelected(new Set(rolePerms));
  }, [rolePerms]);

  useEffect(() => {
    if (!initialRoleId) return;
    if (editableRoles.some((r) => r.id === initialRoleId)) {
      setRoleId(initialRoleId);
    }
  }, [initialRoleId, editableRoles]);

  const canEdit = hasPermission("roles:update");
  const grantable = useMemo(
    () => new Set(actorPerms),
    [actorPerms],
  );

  const grouped = matrix.grouped ?? {};

  async function save() {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await rbacService.updateRole(accessToken, selectedRole.id, {
        permissions: [...selected],
      });
      toast.success(t("staff.permissionsSaved"));
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function togglePerm(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <PermissionGate permissions={["roles:read"]}>
      <div className="border-border bg-card rounded-3xl border p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-bold">{t("staff.permissionMatrix")}</p>
            <p className="text-muted-foreground text-xs">{t("staff.permissionMatrixHint")}</p>
          </div>
          <select
            className="border-border bg-background rounded-xl border px-3 py-2 text-sm"
            value={selectedRole?.id ?? ""}
            onChange={(e) => setRoleId(e.target.value)}
          >
            {editableRoles.map((r: RoleRow) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.is_system ? " (system)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-6">
          {Object.entries(grouped).map(([resource, perms]) => (
            <div key={resource}>
              <p className="text-muted-foreground mb-2 text-xs font-bold tracking-wider uppercase">
                {resource}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {perms.map((p) => {
                  const canToggle =
                    canEdit && (actorRoles.includes("super_admin") || grantable.has(p.name));
                  return (
                    <label
                      key={p.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                        selected.has(p.name) ? "border-primary bg-primary/5" : "border-border",
                        !canToggle && "pointer-events-none opacity-60",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(p.name)}
                        disabled={!canToggle}
                        onChange={() => togglePerm(p.name)}
                      />
                      <span>
                        <span className="font-medium">{p.name}</span>
                        {p.description && (
                          <span className="text-muted-foreground block text-xs">{p.description}</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {canEdit && selectedRole && (
          <RyvoButton intent="cta" className="mt-4" disabled={saving} onClick={() => void save()}>
            {saving ? t("common.loading") : t("staff.savePermissions")}
          </RyvoButton>
        )}
      </div>
    </PermissionGate>
  );
}
