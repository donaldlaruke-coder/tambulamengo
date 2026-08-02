import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { formatUGX } from "@/lib/format";

type Tx = {
  id: string;
  amount: number;
  type: string;
  payment_method: string;
  status: string;
  created_at: string;
  confirmed_at: string | null;
};

const METHOD_LABELS: Record<string, string> = {
  mtn_momo: "MTN MoMo",
  airtel_money: "Airtel Money",
  bank: "Bank Transfer",
  card: "Bank Card",
};

const METHOD_COLORS: Record<string, string> = {
  mtn_momo: "#EAB308", // Yellow
  airtel_money: "#EF4444", // Red
  bank: "#3B82F6", // Blue
  card: "#C9A24B", // Gold
};

export function AdminAnalyticsCharts({ transactions }: { transactions: Tx[] }) {
  const confirmed = useMemo(
    () => transactions.filter((t) => t.status === "confirmed"),
    [transactions]
  );

  // 1. Daily trend data
  const trendData = useMemo(() => {
    const map = new Map<string, { date: string; amount: number; count: number }>();
    const sorted = [...confirmed].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    sorted.forEach((t) => {
      const d = new Date(t.created_at);
      const key = d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
      const current = map.get(key) || { date: key, amount: 0, count: 0 };
      current.amount += t.amount || 0;
      current.count += 1;
      map.set(key, current);
    });

    return Array.from(map.values());
  }, [confirmed]);

  // 2. Payment Method distribution data
  const methodData = useMemo(() => {
    const map: Record<string, number> = {};
    confirmed.forEach((t) => {
      const m = t.payment_method || "other";
      map[m] = (map[m] || 0) + (t.amount || 0);
    });

    return Object.entries(map).map(([method, total]) => ({
      name: METHOD_LABELS[method] || method,
      value: total,
      color: METHOD_COLORS[method] || "#94A3B8",
    }));
  }, [confirmed]);

  // 3. Category trend over time (Kits vs Donations Line Chart)
  const categoryTrendData = useMemo(() => {
    const map = new Map<string, { date: string; kits: number; donations: number }>();
    const sorted = [...confirmed].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    sorted.forEach((t) => {
      const d = new Date(t.created_at);
      const key = d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
      const current = map.get(key) || { date: key, kits: 0, donations: 0 };
      if (t.type === "kit_purchase") {
        current.kits += t.amount || 0;
      } else {
        current.donations += t.amount || 0;
      }
      map.set(key, current);
    });

    return Array.from(map.values());
  }, [confirmed]);

  if (confirmed.length === 0) {
    return (
      <div className="card-heritage p-6 text-center text-muted-foreground text-sm">
        No confirmed transaction data available yet to display analytical charts.
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif font-bold text-primary text-xl">Campaign analytics</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visual breakdown of revenue trends, payment channels, and sales performance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart 1: Revenue Trend (Area Chart) */}
        <div className="card-heritage p-5 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                Revenue Growth
              </div>
              <div className="text-base font-serif font-bold text-primary">Daily Raised Trend</div>
            </div>
            <div className="text-xs font-semibold text-gold bg-gold/10 px-2.5 py-1 rounded-full border border-gold/20">
              {formatUGX(confirmed.reduce((sum, t) => sum + (t.amount || 0), 0))} Total
            </div>
          </div>

          <div className="h-56 w-full min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7A1E2B" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#7A1E2B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={45}
                />
                <Tooltip
                  formatter={(val: number) => [formatUGX(val), "Amount Raised"]}
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    borderColor: "#374151",
                    borderRadius: "0.5rem",
                    color: "#FFF",
                    fontSize: "0.75rem",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#7A1E2B"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Payment Method Breakdown (Pie/Donut Chart) */}
        <div className="card-heritage p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Channels
            </div>
            <div className="text-base font-serif font-bold text-primary mb-2">Payment Methods</div>
          </div>

          <div className="h-44 w-full relative min-h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={methodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {methodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => [formatUGX(val), "Volume"]}
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    borderColor: "#374151",
                    borderRadius: "0.5rem",
                    color: "#FFF",
                    fontSize: "0.75rem",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-border text-xs">
            {methodData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart 3: Category Comparison Line Graph (Run Kits vs Pure Donations) */}
      <div className="card-heritage p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Product Mix Line Graph
            </div>
            <div className="text-base font-serif font-bold text-primary">
              Run Kits vs Direct Donations Trend
            </div>
          </div>
        </div>

        <div className="h-56 w-full min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={categoryTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={45}
              />
              <Tooltip
                formatter={(val: number, name: string) => [
                  formatUGX(val),
                  name === "kits" ? "Run Kits Revenue" : "Direct Donations",
                ]}
                contentStyle={{
                  backgroundColor: "#1F2937",
                  borderColor: "#374151",
                  borderRadius: "0.5rem",
                  color: "#FFF",
                  fontSize: "0.75rem",
                }}
              />
              <Legend
                formatter={(value) => (value === "kits" ? "Run Kits" : "Direct Donations")}
                wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              />
              <Line
                type="monotone"
                dataKey="kits"
                name="kits"
                stroke="#C9A24B"
                strokeWidth={3}
                dot={{ r: 4, fill: "#C9A24B" }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="donations"
                name="donations"
                stroke="#7A1E2B"
                strokeWidth={3}
                dot={{ r: 4, fill: "#7A1E2B" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
