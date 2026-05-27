"use client";

import { useSearchParams } from "next/navigation";

import { PermissionMatrix } from "@/components/admin/permission-matrix";
import { AdminListStack } from "@/components/admin/admin-list-ui";
import { ADMIN_QUERY } from "@/configs/const";
import { useRbac } from "@/hooks/use-rbac";

export function StaffPermissionsTab() {
  const { matrix } = useRbac();
  const searchParams = useSearchParams();
  const roleId = searchParams.get(ADMIN_QUERY.role);

  if (!matrix.data) {
    return null;
  }

  return (
    <AdminListStack>
      <PermissionMatrix
        matrix={matrix.data}
        initialRoleId={roleId}
        onSaved={() => void matrix.refetch()}
      />
    </AdminListStack>
  );
}
