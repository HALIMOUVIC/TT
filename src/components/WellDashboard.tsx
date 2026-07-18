import React, { useState, useEffect } from "react";
import { WellData } from "../types";
import { Search, ListFilter, Droplet, Gauge, Activity, TrendingUp, MapPin } from "lucide-react";

interface WellDashboardProps {
  wells: WellData[];
  activeWellId: string;
  onSelectWell: (id: string) => void;
  onNavigateToTab: (tab: "metadata" | "wellbore" | "perforations" | "history") => void;
  onCreateNewWell: () => void;
  onDeleteWell?: (id: string) => void;
}

/* ── Donut Chart ─────────────────────────────────────────────── */
function DonutChart({ slices, total }: { slices: { label: string; value: number; color: string }[]; total: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 100); return () => clearTimeout(t); }, []);
  const S = 160, cx = S / 2, cy = S / 2, R = 58, r = 38, sw = R - r;
  let cur = -Math.PI / 2;
  const arcs = slices.map(d => {
    const angle = total > 0 ? (d.value / total) * 2 * Math.PI : 0;
    const sa = cur; cur += angle;
    return { ...d, sa, angle };
  });
  const arc = (sa: number, angle: number) => {
    const m = r + sw / 2, x1 = cx + m * Math.cos(sa), y1 = cy + m * Math.sin(sa);
    const x2 = cx + m * Math.cos(sa + angle), y2 = cy + m * Math.sin(sa + angle);
    return `M ${x1} ${y1} A ${m} ${m} 0 ${angle > Math.PI ? 1 : 0} 1 ${x2} ${y2}`;
  };
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      <circle cx={cx} cy={cy} r={r + sw / 2} fill="none" stroke="#f1f5f9" strokeWidth={sw + 4} />
      <circle cx={cx} cy={cy} r={r + sw / 2} fill="none" stroke="#e2e8f0" strokeWidth={sw} />
      {arcs.map((a, i) => (
        <path key={i} d={arc(a.sa, Math.max(a.angle - 0.06, 0.01))} fill="none" stroke={a.color}
          strokeWidth={sw} strokeLinecap="round"
          style={{ opacity: on ? 1 : 0, transition: `opacity 0.5s ease ${i * 0.12}s` }} />
      ))}
      {/* center white circle */}
      <circle cx={cx} cy={cy} r={r - 1} fill="white" />
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="22" fontWeight="800" fill="#0f172a" fontFamily="'Inter',sans-serif">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fontWeight="600" fill="#94a3b8" fontFamily="'Inter',sans-serif" letterSpacing="1.5">PUITS</text>
    </svg>
  );
}

/* ── Animated fill bar ───────────────────────────────────────── */
function FillBar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), delay); return () => clearTimeout(t); }, [pct, delay]);
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: `${color}18` }}>
      <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${w}%`, background: `linear-gradient(90deg,${color}80,${color})` }} />
    </div>
  );
}

/* ── Depth row ───────────────────────────────────────────────── */
function DepthRow({ name, depth, pct, color, delay }: { name: string; depth: number; pct: number; color: string; delay: number }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), delay); return () => clearTimeout(t); }, [pct, delay]);
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-12 text-right text-[10px] font-semibold shrink-0 truncate text-slate-500" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{name}</span>
      <div className="flex-1 rounded-md overflow-hidden" style={{ height: 20, background: "#f1f5f9" }}>
        <div className="h-full rounded-md flex items-center justify-end px-2 transition-all duration-700 ease-out"
          style={{ width: `${w}%`, background: `linear-gradient(90deg,${color}50,${color})`, minWidth: depth > 0 ? 32 : 0 }}>
          <span className="text-[9px] font-bold text-white whitespace-nowrap" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
            {depth > 0 ? `${depth.toFixed(0)}m` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────── */
export default function WellDashboard({ wells, activeWellId, onSelectWell, onNavigateToTab }: WellDashboardProps) {
  const [search, setSearch] = useState("");
  const [filterP, setFilterP] = useState("ALL");

  const getNorm = (p: string) => {
    const pl = (p || "").toLowerCase();
    if (pl.includes("pph") || pl.includes("huile") || pl.includes("oil")) return "PPH";
    if (pl.includes("ppg") || pl.includes("gaz") || pl.includes("gas")) return "PPG";
    if (pl.includes("inject")) return "Injecteur";
    return p || "Autre";
  };

  const getDepth = (w: WellData) => Math.max(
    w.casings?.reduce((m, c) => Math.max(m, c.shoeDepth || 0), 0) || 0,
    w.tubings?.reduce((m, t) => Math.max(m, t.bottomDepth || 0), 0) || 0
  );

  const total = wells.length;
  const resCnt: Record<string, number> = {};
  const purpCnt: Record<string, number> = {};
  wells.forEach(w => {
    const r = w.reservoir || "N/A"; resCnt[r] = (resCnt[r] || 0) + 1;
    const p = getNorm(w.purpose); purpCnt[p] = (purpCnt[p] || 0) + 1;
  });

  const deepest = wells.reduce((b, w) => { const d = getDepth(w); return d > b.depth ? { name: w.name, depth: d } : b; }, { name: "—", depth: 0 });
  const avgD = total > 0 ? wells.reduce((s, w) => s + getDepth(w), 0) / total : 0;

  const PC: Record<string, string> = { "PPH": "#f97316", "PPG": "#3b82f6", "Injecteur": "#10b981", "Autre": "#8b5cf6" };
  const RC = ["#f97316","#3b82f6","#10b981","#8b5cf6","#ec4899","#14b8a6","#f59e0b","#6366f1"];

  const donutSlices = Object.entries(purpCnt).map(([l, v]) => ({ label: l, value: v, color: PC[l] || "#94a3b8" }));
  const depthTop = [...wells].sort((a, b) => getDepth(b) - getDepth(a)).slice(0, 8);
  const maxD = Math.max(...depthTop.map(getDepth), 1);
  const DC = ["#f97316","#3b82f6","#10b981","#8b5cf6","#f43f5e","#f59e0b","#06b6d4","#6366f1"];

  const filtered = wells.filter(w => {
    const p = getNorm(w.purpose);
    return (w.name.toLowerCase().includes(search.toLowerCase()) || (w.reservoir||"").toLowerCase().includes(search.toLowerCase()) || p.toLowerCase().includes(search.toLowerCase()))
      && (filterP === "ALL" || p === filterP);
  });

  /* KPI cards */
  const kpis = [
    { label: "Total Puits", value: String(total), sub: "dans le parc pétrolier", Icon: Droplet, accent: "#f97316", bg: "#fff7ed", border: "#fed7aa" },
    { label: "Puits le Plus Profond", value: deepest.depth > 0 ? `${deepest.depth.toFixed(0)} m` : "—", sub: deepest.name, Icon: Gauge, accent: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
    { label: "Profondeur Moyenne", value: avgD > 0 ? `${avgD.toFixed(0)} m` : "—", sub: "tous puits confondus", Icon: Activity, accent: "#10b981", bg: "#f0fdf4", border: "#a7f3d0" },
    { label: "Réservoirs Actifs", value: String(Object.keys(resCnt).length), sub: "formations productrices", Icon: TrendingUp, accent: "#8b5cf6", bg: "#faf5ff", border: "#ddd6fe" },
  ];

  return (
    <div className="space-y-5" style={{ fontFamily: "'Inter',sans-serif" }} id="well_dashboard_root">

      {/* ══ KPI CARDS ══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" id="dashboard_stats_grid">
        {kpis.map(({ label, value, sub, Icon, accent, bg, border }) => (
          <div key={label}
            className="rounded-2xl p-4 relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-default"
            style={{ background: bg, border: `1.5px solid ${border}` }}>
            {/* Faint icon watermark */}
            <div className="absolute -right-3 -bottom-3 opacity-[0.07]">
              <Icon style={{ width: 64, height: 64, color: accent }} />
            </div>
            <div className="mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: accent }}>
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-[9px] font-semibold uppercase tracking-widest mb-1 text-slate-500" style={{ fontFamily: "'Inter',sans-serif", letterSpacing: "0.1em" }}>{label}</p>
            <p className="text-2xl font-black leading-none text-slate-900 mb-1" style={{ fontFamily: "'Inter',sans-serif", color: accent }}>{value}</p>
            <p className="text-[9px] text-slate-400 truncate font-medium" style={{ fontFamily: "'Inter',sans-serif" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ══ CHARTS ROW ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Donut */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-800" style={{ fontFamily: "'Inter',sans-serif" }}>Objectifs de Production</h3>
              <p className="text-[9px] text-slate-400 mt-0.5">Répartition par type de puits</p>
            </div>
          </div>
          {total > 0 ? (
            <div className="flex items-center gap-5 justify-center">
              <div className="shrink-0">
                <DonutChart slices={donutSlices} total={total} />
              </div>
              <div className="space-y-3 flex-1 min-w-0">
                {donutSlices.map((d, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-[10px] font-semibold text-slate-700 truncate" style={{ fontFamily: "'Inter',sans-serif" }}>{d.label}</span>
                      </div>
                      <span className="text-[10px] font-black shrink-0 ml-2" style={{ color: d.color, fontFamily: "'JetBrains Mono',monospace" }}>
                        {d.value} <span className="font-normal text-slate-400">/ {total}</span>
                      </span>
                    </div>
                    <FillBar pct={Math.round((d.value / total) * 100)} color={d.color} delay={200 + i * 100} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-slate-300 text-xs">Aucune donnée</div>
          )}
        </div>

        {/* Depth bars */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-xs font-bold text-slate-800" style={{ fontFamily: "'Inter',sans-serif" }}>Profondeurs Comparées</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Top {depthTop.length} puits par profondeur maximale</p>
          </div>
          {depthTop.length > 0 ? (
            <div className="space-y-2.5">
              {depthTop.map((w, i) => (
                <DepthRow key={w.id} name={w.name} depth={getDepth(w)} pct={(getDepth(w) / maxD) * 100}
                  color={DC[i % DC.length]} delay={150 + i * 60} />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-slate-300 text-xs">Aucune donnée</div>
          )}
        </div>
      </div>

      {/* ══ RESERVOIRS ══ */}
      {Object.keys(resCnt).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <h3 className="text-xs font-bold text-slate-800" style={{ fontFamily: "'Inter',sans-serif" }}>Répartition par Réservoir</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(resCnt).map(([name, count], i) => {
              const color = RC[i % RC.length];
              const pct = Math.round((count / total) * 100);
              return (
                <div key={name} className="rounded-xl p-3.5 space-y-2.5"
                  style={{ background: `${color}0d`, border: `1.5px solid ${color}22` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="text-[10px] font-bold text-slate-800" style={{ fontFamily: "'Inter',sans-serif" }}>Rés. {name}</span>
                    </div>
                    <span className="text-[9px] font-black text-white px-1.5 py-0.5 rounded-full" style={{ background: color, fontFamily: "'JetBrains Mono',monospace" }}>{count}</span>
                  </div>
                  <FillBar pct={pct} color={color} delay={200} />
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-slate-400" style={{ fontFamily: "'Inter',sans-serif" }}>{count} {count > 1 ? "puits" : "puit"}</span>
                    <span className="text-[9px] font-bold" style={{ color, fontFamily: "'JetBrains Mono',monospace" }}>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ TABLE ══ */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-[11px] font-bold text-slate-800" style={{ fontFamily: "'Inter',sans-serif" }}>Inventaire des Puits</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Cliquer sur une ligne pour accéder à la fiche technique</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Rechercher..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-medium focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-50 w-36 transition-all" />
            </div>
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
              <ListFilter className="w-3 h-3 text-slate-400 shrink-0" />
              <select className="bg-transparent focus:outline-none text-[10px] font-medium text-slate-600 cursor-pointer max-w-[120px]"
                value={filterP} onChange={e => setFilterP(e.target.value)}>
                <option value="ALL">Tous les Usages</option>
                {Object.keys(purpCnt).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Puits", "Objectif", "Réservoir", "Prof. Max", "Z Sol", "Z Forage", "Z Prod", "Csg / Tbg"].map((h, i) => (
                  <th key={h} className={`py-2.5 px-4 text-[9px] font-semibold uppercase tracking-widest text-slate-400 ${i > 1 ? "text-center" : ""}`}
                    style={{ fontFamily: "'Inter',sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((well, ri) => {
                const isActive = well.id === activeWellId;
                const depth = getDepth(well);
                const purpose = getNorm(well.purpose);
                const pc = PC[purpose] || "#94a3b8";
                return (
                  <tr key={well.id}
                    onClick={() => { onSelectWell(well.id); onNavigateToTab("metadata"); }}
                    className={`cursor-pointer border-b border-slate-50 transition-all hover:bg-slate-50/80 ${isActive ? "bg-orange-50/60" : ri % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-1 h-8 rounded-full shrink-0" style={{ background: isActive ? "#f97316" : "#e2e8f0" }} />
                        <div>
                          <p className="text-[11px] font-bold text-slate-800" style={{ fontFamily: "'Inter',sans-serif" }}>{well.name}</p>
                          <p className="text-[9px] text-slate-400" style={{ fontFamily: "'JetBrains Mono',monospace" }}>Folio {well.folio || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex text-[9px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: pc, background: `${pc}15`, border: `1px solid ${pc}25` }}>{purpose}</span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{well.reservoir || "—"}</span>
                    </td>
                    <td className="py-2.5 px-4 text-center text-[10px] font-bold text-slate-700" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{depth > 0 ? `${depth.toFixed(1)} m` : "—"}</td>
                    <td className="py-2.5 px-4 text-center text-[10px] text-slate-500" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{well.elevationSol ?? "—"}</td>
                    <td className="py-2.5 px-4 text-center text-[10px] text-slate-500" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{well.elevationForage ?? "—"}</td>
                    <td className="py-2.5 px-4 text-center text-[10px] text-slate-500" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{well.elevationProduction ?? "—"}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
                        {well.casings?.length || 0}C / {well.tubings?.length || 0}T
                      </span>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={8} className="py-12 text-center text-[11px] text-slate-400">Aucun puits ne correspond à votre recherche.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
