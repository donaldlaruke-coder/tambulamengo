import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
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
    // Sort ascending by date
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

  // 3. Category comparison data (Kits vs Donations)
  const categoryData = useMemo(() => {
    let kitsAmount = 0;
    let donAmount = 0;
    let kitsCount = 0;
    let donCount = 0;

    confirmed.forEach((t) => {
      if (t.type === "kit_purchase") {
        kitsAmount += t.amount || 0;
        kitsCount += 1;
      } else {
        donAmount += t.amount || 0;
        donCount += 1;
      }
    });

    return [
      { category: "Run Kits", amount: kitsAmount, count: kitsCount, fill: "#C9A24B" },
      { category: "Donations", amount: donAmount, count: donCount, fill: "#7A1E2B" },
    ];
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

      {/* Chart 3: Category Comparison (Bar Chart) */}
      <div className="card-heritage p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Product Mix
            </div>
            <div className="text-base font-serif font-bold text-primary">Kits vs Pure Donations</div>
          </div>
        </div>

        <div className="h-48 w-full min-h-[190px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <XAxis
                type="number"
                tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis dataKey="category" type="category" tick={{ fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip
                formatter={(val: number) => [formatUGX(val), "Revenue"]}
                contentStyle={{
                  backgroundColor: "#1F2937",
                  borderColor: "#374151",
                  borderRadius: "0.5rem",
                  color: "#FFF",
                  fontSize: "0.75rem",
                }}
              />
              <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
