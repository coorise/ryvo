"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

type SimpleTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  empty?: string;
};

function rowKey<T>(row: T, index: number): string | number {
  const r = row as { id?: string; user_id?: string };
  return r.id ?? r.user_id ?? index;
}

export function SimpleTable<T>({ columns, rows, empty }: SimpleTableProps<T>) {
  if (!rows.length) {
    return <p className="text-muted-foreground py-8 text-center text-sm">{empty ?? "—"}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-muted/50 text-muted-foreground border-b text-xs uppercase tracking-wide">
            {columns.map((c) => (
              <th key={c.key} className={cn("px-4 py-3 font-semibold", c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey(row, i)} className="border-border border-b last:border-0">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-4 py-3", c.className)}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
