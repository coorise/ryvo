"use client";

import { useTranslation } from "react-i18next";

import { TariffsPanel } from "@/components/admin/finance/tariffs-panel";

export default function FinanceTariffsPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("financeTariffs.title")}</h1>
      </div>
      <TariffsPanel />
    </div>
  );
}
