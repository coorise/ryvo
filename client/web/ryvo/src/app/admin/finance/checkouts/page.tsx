"use client";

import { useTranslation } from "react-i18next";

import { CheckoutsPanel } from "@/components/admin/finance/checkouts-panel";

export default function FinanceCheckoutsPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("financeCheckouts.title")}</h1>
      </div>
      <CheckoutsPanel />
    </div>
  );
}
