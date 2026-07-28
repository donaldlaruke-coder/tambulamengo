import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatUGX } from "@/lib/format";
import { getBackendUrl } from "@/lib/backend-url";
import crest from "@/assets/mengo-badge.jpg";

type Kit = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  size_options: string[];
  stock: number | null;
};

export const Route = createFileRoute("/kits")({
  head: () => ({
    meta: [
      { title: "Get your run kit — Tambula Mengo" },
      { name: "description", content: "Reserve your official Tambula Mengo walk & run kit." },
    ],
  }),
  component: KitsPage,
});

function KitsPage() {
  const nav = useNavigate();
  const { data: kits, isLoading } = useQuery({
    queryKey: ["kits", "active"],
    queryFn: async () => {
      if (import.meta.env.VITE_USE_DJANGO === "true") {
        const url = `${getBackendUrl()}/api/kits/`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch kits");
        return (await res.json()) as Kit[];
      }
      const { data, error } = await supabase
        .from("kit_products")
        .select("id,name,description,price,size_options,stock")
        .eq("active", true)
        .order("price");
      if (error) throw error;
      return (data ?? []) as Kit[];
    },
  });

  const [size, setSize] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = kits?.find((k) => k.id === selectedId) ?? kits?.[0];
  const activeId = selected?.id ?? "";

  function checkout() {
    if (!selected) return;
    if (selected.size_options.length && !size) return;
    nav({
      to: "/donate",
      search: {
        amount: selected.price * qty,
        kit: selected.id,
        size: size || undefined,
        qty,
      },
    });
  }

  return (
    <div className="container-page py-8 md:py-12 pb-24 md:pb-12 grid md:grid-cols-2 gap-8 items-start">
      <div className="card-heritage p-8 bg-primary text-primary-foreground">
        <img src={crest} alt="Mengo badge" width={160} height={160} className="mx-auto h-40 w-40 rounded-full object-cover ring-4 ring-gold/70 shadow-xl" />
        <div className="text-center mt-4">
          <div className="text-xs uppercase tracking-widest text-gold">Official kit</div>
          <h1 className="text-3xl font-serif font-bold mt-1">Tambula Mengo Run Kit</h1>
          <p className="text-white/80 mt-2 text-sm">Branded shirt · race number · wristband</p>
        </div>
      </div>

      <div>
        {isLoading ? (
          <div className="text-muted-foreground">Loading kits…</div>
        ) : !kits?.length ? (
          <div className="text-muted-foreground">No kits available right now.</div>
        ) : (
          <>
            {kits.length > 1 && (
              <div className="grid grid-cols-2 gap-2 mb-5">
                {kits.map((k) => (
                  <button
                    key={k.id}
                    onClick={() => { setSelectedId(k.id); setSize(""); }}
                    className={`rounded-lg border-2 p-3 text-left ${
                      activeId === k.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="font-semibold">{k.name}</div>
                    <div className="text-sm text-primary font-semibold">{formatUGX(k.price)}</div>
                  </button>
                ))}
              </div>
            )}

            {selected && (
              <div className="card-heritage p-6 space-y-5">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-primary">{selected.name}</h2>
                  <p className="text-muted-foreground text-sm mt-1">{selected.description}</p>
                  <div className="text-3xl font-serif font-bold text-primary mt-4">{formatUGX(selected.price)}</div>
                </div>

                {selected.size_options.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold mb-2">Choose size</label>
                    <div className="flex flex-wrap gap-2">
                      {selected.size_options.map((s) => (
                        <button
                          key={s}
                          onClick={() => setSize(s)}
                          className={`min-w-14 min-h-12 px-4 rounded-lg border-2 font-semibold ${
                            size === s ? "border-primary bg-primary text-primary-foreground" : "border-border"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold mb-2">Quantity</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="btn-outline !min-h-12 !px-4 text-xl"
                      aria-label="Decrease"
                    >−</button>
                    <div className="min-w-16 text-center text-xl font-semibold">{qty}</div>
                    <button
                      onClick={() => setQty(Math.min(20, qty + 1))}
                      className="btn-outline !min-h-12 !px-4 text-xl"
                      aria-label="Increase"
                    >+</button>
                  </div>
                </div>

                <div className="border-t border-border pt-4 flex justify-between items-baseline">
                  <div className="text-sm text-muted-foreground">Total</div>
                  <div className="text-2xl font-serif font-bold text-primary">{formatUGX(selected.price * qty)}</div>
                </div>

                <button
                  onClick={checkout}
                  disabled={selected.size_options.length > 0 && !size}
                  className="btn-primary w-full text-base"
                >
                  Continue to payment
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  Kits are collected at the school pavilion the week before the walk.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}