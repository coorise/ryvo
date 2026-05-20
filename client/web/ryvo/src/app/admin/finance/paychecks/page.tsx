"use client";

import { useTranslation } from "react-i18next";

import { PaychecksPanel } from "@/components/admin/finance/paychecks-panel";

export default function FinancePaychecksPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("financePaychecks.title")}</h1>
      </div>
      <PaychecksPanel />
    </div>
  );
}
