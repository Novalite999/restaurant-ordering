"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function RevenueChart({ data }: { data: { day: string; revenue: number; orders: number }[] }) {
  return (
    <div className="h-64 w-full px-2 pt-4 pb-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-line)" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--color-muted)" }} interval="preserveStartEnd" />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fontSize: 12, fill: "var(--color-muted)" }}
            tickFormatter={(v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`)}
          />
          <Tooltip
            cursor={{ fill: "var(--color-mist)" }}
            contentStyle={{ borderRadius: 12, border: "1px solid var(--color-line)", boxShadow: "var(--shadow-lift)", fontSize: 13 }}
            formatter={(v, name) => (name === "revenue" ? [`$${Number(v).toFixed(2)}`, "Sales"] : [v, "Orders"])}
          />
          <Bar dataKey="revenue" fill="var(--color-basil)" radius={[6, 6, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
