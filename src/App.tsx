import React, { useState, useEffect, useMemo, useRef } from "react";
import { WellData } from "./types";
import WellboreSchematic from "./components/WellboreSchematic";
import WellMetadataForm from "./components/WellMetadataForm";
import WellboreForm from "./components/WellboreForm";
import PerforationForm from "./components/PerforationForm";
import WellHistory, { HistoryRecord } from "./components/WellHistory";
import WellboreA4Print from "./components/WellboreA4Print";
import WellDashboard from "./components/WellDashboard";
import Login from "./components/Login";
import CustomToolsModal from "./components/CustomToolsModal";

import { updateTubingComponentMatrix } from "./lib/wellboreEngine";
import {
  Plus,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Layers,
  Grid,
  FileText,
  Flame,
  Activity,
  Droplet,
  Database,
  Sliders,
  ChevronRight,
  Sparkles,
  Info,
  History,
  Printer,
  Save,
  Search,
  ChevronUp,
  Calendar,
} from "lucide-react";

const getDefaultTemplateWells = (): WellData[] => {
  const defaultWell: WellData = {
    id: "well-default",
    name: "Nouveau Puits",
    purpose: "Puits Producteur",
    completionType: "COMPLETION SIMPLE",
    reservoir: "",
    field: "",
    elevationSol: 0,
    elevationForage: 0,
    elevationProduction: 0,
    spoolProd: "",
    packerType: "",
    suspTbg: "",
    etanTbg: "",
    origineCotes: "",
    folio: "01",
    folioToCancel: "00",
    casings: [],
    tubings: [],
    perforations: [],
    observations: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return [defaultWell];
};

function normalizeFolio(folio: string): string {
  const trimmed = String(folio).trim();
  const n = parseInt(trimmed, 10);
  if (isNaN(n) || n < 0) return trimmed;
  return String(n).padStart(2, "0");
}

export default function App() {
  const [wells, setWells] = useState<WellData[]>([]);
  const [activeWellId, setActiveWellId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "metadata" | "wellbore" | "perforations" | "history" | "custom_tools"
  >("dashboard");
  const [activeCategory, setActiveCategory] = useState<"params" | "architecture" | "perforations">("params");

  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isManualSaving, setIsManualSaving] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ id: number, matricule: string, nom_prenom: string, role: string } | null>(null);
  const [historyCache, setHistoryCache] = useState<Record<string, HistoryRecord[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  /** Set only when user clicks Edit from Historique — Save then updates that folio. */
  const [editingFolio, setEditingFolio] = useState<{ wellId: string; folio: string } | null>(null);
  const editingFolioRef = useRef<{ wellId: string; folio: string } | null>(editingFolio);
  const wellsRef = useRef<WellData[]>([]);
  const activeWellIdRef = useRef(activeWellId);

  useEffect(() => {
    editingFolioRef.current = editingFolio;
  }, [editingFolio]);

  useEffect(() => {
    wellsRef.current = wells;
  }, [wells]);

  useEffect(() => {
    activeWellIdRef.current = activeWellId;
  }, [activeWellId]);

  // States for Smart Search and perimeter / year classification
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedPerimeter, setSelectedPerimeter] = useState<string>("TOUT");
  const [selectedYear, setSelectedYear] = useState<string>("TOUT");

  // Custom non-blocking dialog state for iframe compatibility
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: "alert" | "confirm";
    title: string;
    message: string;
    onConfirm?: () => void;
  } | null>(null);

  const clearEditingFolio = () => {
    editingFolioRef.current = null;
    setEditingFolio(null);
  };

  const setEditingFolioContext = (ctx: { wellId: string; folio: string }) => {
    const normalized = { wellId: ctx.wellId, folio: normalizeFolio(ctx.folio) };
    editingFolioRef.current = normalized;
    setEditingFolio(normalized);
  };

  /** Normal Fiche Technique navigation — next Save creates a new folio. */
  const openFicheTechnique = () => {
    clearEditingFolio();
    setActiveTab("metadata");
  };

  // Clear any stale edit flag left from a previous browser session
  useEffect(() => {
    try {
      sessionStorage.removeItem("wellbore_edit_folio");
    } catch {
      /* ignore */
    }
  }, []);

  const showAlert = (title: string, message: string) => {
    setDialog({
      isOpen: true,
      type: "alert",
      title,
      message,
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setDialog({
      isOpen: true,
      type: "confirm",
      title,
      message,
      onConfirm,
    });
  };

  // Load from Supabase (Real-time direct database fetch on mount)
  useEffect(() => {
    const loadFromSupabase = async () => {
      setIsInitialLoading(true);
      try {
        // Fetch custom tool types first to populate TUBING_COMPONENT_MATRIX
        try {
          const toolRes = await fetch("/api/supabase/custom-tool-types");
          if (toolRes.ok) {
            const toolData = await toolRes.json();
            if (toolData.success && toolData.data) {
              updateTubingComponentMatrix(toolData.data);
            }
          }
        } catch (err) {
          console.warn("Failed to load custom tool types:", err);
        }

        const response = await fetch("/api/supabase/pull-wells", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.wells && result.wells.length > 0) {
            setWells(result.wells);
            setActiveWellId(result.wells[0].id);
            console.log("Loaded wells directly from real-time database.");
          } else {
            const templates = getDefaultTemplateWells();
            setWells(templates);
            setActiveWellId(templates[0].id);
          }
        } else {
          const templates = getDefaultTemplateWells();
          setWells(templates);
          setActiveWellId(templates[0].id);
        }
      } catch (err) {
        console.warn("Database retrieval failed, using fallback templates:", err);
        const templates = getDefaultTemplateWells();
        setWells(templates);
        setActiveWellId(templates[0].id);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadFromSupabase();
  }, []);

  // Get unique perimeters from all wells
  const uniquePerimeters = Array.from(
    new Set(wells.map((w) => w.field || "Tiguentourine").filter(Boolean))
  ).sort();

  // Get unique years from all wells
  const uniqueYears = Array.from(
    new Set(
      wells
        .map((w) => {
          if (w.createdAt) {
            try {
              const yr = new Date(w.createdAt).getFullYear();
              if (!isNaN(yr)) return String(yr);
            } catch (e) {}
          }
          return String(new Date().getFullYear());
        })
        .filter(Boolean)
    )
  ).sort((a, b) => b.localeCompare(a));

  // Filtered list of wells using Perimeter, Year and Smart Search
  const filteredWells = wells.filter((well) => {
    // 1. Perimeter filter
    if (selectedPerimeter !== "TOUT") {
      const pVal = well.field || "Tiguentourine";
      if (pVal.toLowerCase() !== selectedPerimeter.toLowerCase()) {
        return false;
      }
    }

    // 2. Year filter
    if (selectedYear !== "TOUT") {
      let wellYear = String(new Date().getFullYear());
      if (well.createdAt) {
        try {
          const yr = new Date(well.createdAt).getFullYear();
          if (!isNaN(yr)) wellYear = String(yr);
        } catch (e) {}
      }
      if (wellYear !== selectedYear) {
        return false;
      }
    }

    // 3. Smart Search (searches multiple well fields)
    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      const nameMatch = (well.name || "").toLowerCase().includes(q);
      const permMatch = (well.field || "Tiguentourine").toLowerCase().includes(q);
      const resMatch = (well.reservoir || "").toLowerCase().includes(q);
      const folioMatch = (well.folio || "").toLowerCase().includes(q);
      const purposeMatch = (well.purpose || "").toLowerCase().includes(q);
      const compMatch = (well.completionType || "").toLowerCase().includes(q);

      return nameMatch || permMatch || resMatch || folioMatch || purposeMatch || compMatch;
    }

    return true;
  });

  // Historique: specific well → only that well's folios; "TOUS LES PUITS" → all wells in current périmètre/filters
  const historyWellIds = useMemo(() => {
    if (activeTab !== "history") {
      return activeWellId && activeWellId !== "TOUT" ? [activeWellId] : [];
    }
    if (activeWellId === "TOUT") {
      return filteredWells.map((w) => w.id);
    }
    if (activeWellId) {
      return [activeWellId];
    }
    return filteredWells.map((w) => w.id);
  }, [activeTab, activeWellId, filteredWells]);

  const displayedHistory = useMemo(() => {
    let records = historyWellIds.flatMap((id) => historyCache[id] || []);
    // When a single well is selected, only show folios belonging to that well
    if (activeTab === "history" && activeWellId && activeWellId !== "TOUT") {
      records = records.filter((r) => r.snapshot?.id === activeWellId);
    }
    return records.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [historyWellIds, historyCache, activeTab, activeWellId]);

  // Fetch history for all wells in scope (single well or combined list)
  useEffect(() => {
    if (historyWellIds.length === 0) return;

    const missingIds = historyWellIds.filter((id) => historyCache[id] === undefined);
    if (missingIds.length === 0) {
      setLoadingHistory(false);
      return;
    }

    let isSubscribed = true;
    setLoadingHistory(true);

    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          missingIds.map(async (wellId) => {
            const res = await fetch(`/api/supabase/well-history/${wellId}`);
            if (!res.ok) return { wellId, history: [] as HistoryRecord[] };
            const data = await res.json();
            return { wellId, history: data.success ? data.history || [] : [] };
          })
        );
        if (!isSubscribed) return;
        setHistoryCache((prev) => {
          const next = { ...prev };
          for (const { wellId, history } of results) {
            next[wellId] = history;
          }
          return next;
        });
      } catch (err) {
        console.warn("Could not fetch well history:", err);
      } finally {
        if (isSubscribed) setLoadingHistory(false);
      }
    };

    fetchAll();
    return () => {
      isSubscribed = false;
    };
  }, [historyWellIds.join("|")]);

  // Find active well
  const activeWell =
    activeWellId === "TOUT"
      ? filteredWells[0] || wells[0]
      : filteredWells.find((w) => w.id === activeWellId) || filteredWells[0] || wells[0];

  // Keep activeWellId in sync when current selection is no longer in filtered list
  useEffect(() => {
    if (activeWellId === "TOUT") return;

    // Do not auto-switch the active well if the user is currently editing it
    if (activeTab === "metadata" || activeTab === "wellbore" || activeTab === "perforations") {
      return;
    }

    const stillInList = filteredWells.some((w) => w.id === activeWellId);
    if (!stillInList && activeWell) {
      setActiveWellId(activeWell.id);
    }
  }, [activeWell, activeWellId, filteredWells, activeTab]);

  // "TOUT" is only valid on Historique tab
  useEffect(() => {
    if (activeTab !== "history" && activeWellId === "TOUT") {
      const first = filteredWells[0];
      if (first) setActiveWellId(first.id);
    }
  }, [activeTab, activeWellId, filteredWells]);

  // Handle active well changes
  const handleWellChange = (updatedWell: WellData) => {
    setWells((prev) =>
      prev.map((w) => (w.id === updatedWell.id ? updatedWell : w)),
    );
  };

  // Create a brand new well completion card
  const createNewWell = async () => {
    const newWell: WellData = {
      id: `well-${Date.now()}`,
      name: `NEW WELL - ${wells.length + 1}`,
      purpose: "Oil Producer",
      completionType: "COMPLETION SIMPLE",
      reservoir: "",
      field: selectedPerimeter !== "TOUT" ? selectedPerimeter : "Tiguentourine",
      elevationSol: 0,
      elevationForage: 0,
      elevationProduction: 0,
      folio: "00",
      folioToCancel: "00",
      casings: [],
      tubings: [],
      perforations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setWells((prev) => [...prev, newWell]);
    setActiveWellId(newWell.id);
    clearEditingFolio();
    setActiveTab("metadata");

    // Add to database directly
    try {
      await fetch("/api/supabase/push-wells", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wells: [newWell],
        }),
      });
      console.log("New well saved directly to the database.");
    } catch (err) {
      console.warn("Could not save new well to database on creation:", err);
    }
  };

  // Delete a well by its ID
  const deleteWell = (id: string) => {
    const wellToDelete = wells.find((w) => w.id === id);
    if (!wellToDelete) return;
    if (wells.length <= 1) {
      showAlert(
        "Cannot Delete Well",
        "Cannot delete the only well completion card. Please create another one first."
      );
      return;
    }
    showConfirm(
      "Confirm Well Deletion",
      `Are you sure you want to permanently delete the completion card for ${wellToDelete.name}?`,
      async () => {
        const remaining = wells.filter((w) => w.id !== id);
        setWells(remaining);
        if (activeWellId === id) {
          setActiveWellId(remaining[0].id);
          clearEditingFolio();
        }

        // Delete from database directly
        try {
          const response = await fetch("/api/supabase/delete-well", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          });
          const result = await response.json();
          if (result.success) {
            console.log("Well successfully deleted from database.");
            // Clean historyCache
            setHistoryCache((prev) => {
              const updated = { ...prev };
              delete updated[id];
              return updated;
            });
          } else {
            console.error("Failed to delete well from database:", result.error);
          }
        } catch (err) {
          console.warn("Could not delete well from database:", err);
        }
      }
    );
  };

  // Delete current well
  const deleteActiveWell = () => {
    deleteWell(activeWellId);
  };

  const userRole = (currentUser?.role || "").toLowerCase();
  const isAdmin = userRole === "admin" || userRole === "cheif";

  const editHistoryRecord = (record: HistoryRecord) => {
    const snapshot = record.snapshot;
    if (!snapshot?.id) return;
    showConfirm(
      "Modifier ce folio",
      `Charger le folio N° ${record.folio} de ${snapshot.name} pour modification ? Les données actuelles seront remplacées.`,
      () => {
        setWells((prev) => prev.map((w) => (w.id === snapshot.id ? { ...snapshot } : w)));
        setActiveWellId(snapshot.id);
        setEditingFolioContext({
          wellId: snapshot.id,
          folio: record.folio || snapshot.folio || "00",
        });
        setActiveTab("metadata");
        setActiveCategory("params");
      }
    );
  };

  const deleteHistoryRecord = (record: HistoryRecord) => {
    const wellName = record.snapshot?.name || "ce puits";
    showConfirm(
      "Supprimer ce folio",
      `Supprimer définitivement le folio N° ${record.folio} de ${wellName} ?`,
      async () => {
        try {
          const res = await fetch(`/api/supabase/well-history/${record.id}`, { method: "DELETE" });
          const data = await res.json();
          if (!res.ok || !data.success) {
            showAlert("Erreur", data.error || "Impossible de supprimer ce folio.");
            return;
          }
          const wellKey = record.snapshot?.id;
          if (wellKey) {
            setHistoryCache((prev) => ({
              ...prev,
              [wellKey]: (prev[wellKey] || []).filter((r) => r.id !== record.id),
            }));
          }
        } catch (err) {
          console.warn("Could not delete history record:", err);
          showAlert("Erreur", "Impossible de supprimer ce folio.");
        }
      }
    );
  };

  // Manual save of active well to Supabase
  const saveWellToDb = async () => {
    const ctxAtClick = editingFolioRef.current;
    const wellIdAtClick = activeWellIdRef.current;
    const isUpdatingAtClick =
      ctxAtClick?.wellId === wellIdAtClick && !!ctxAtClick?.folio;

    showConfirm(
      "Confirmation d'Enregistrement",
      isUpdatingAtClick
        ? `Enregistrer les modifications dans le Folio N° ${ctxAtClick!.folio} ?\nLe folio existant sera mis à jour (aucun nouveau folio ne sera créé).`
        : "IMPORTANT :\nSi vous enregistrez, un nouveau folio sera créé dans l'historique.\nÊtes-vous sûr de vouloir enregistrer ?",
      async () => {
        const ctx = editingFolioRef.current;
        const currentWellId = activeWellIdRef.current;
        const activeWell = wellsRef.current.find((w) => w.id === currentWellId);
        if (!activeWell) return;

        const isUpdatingFolio = ctx?.wellId === currentWellId && !!ctx?.folio;
        const folioToUpdate = isUpdatingFolio ? normalizeFolio(ctx!.folio) : undefined;

        const { saveAsFolio: _ignored, ...wellBase } = activeWell as WellData & {
          saveAsFolio?: string;
        };
        const wellToSave: WellData & { saveAsFolio?: string } = {
          ...wellBase,
          updatedDate: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString(),
          ...(folioToUpdate ? { saveAsFolio: folioToUpdate } : {}),
        };

        setIsManualSaving(true);
        try {
          const response = await fetch("/api/supabase/push-wells", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              wells: [wellToSave],
              ...(folioToUpdate
                ? { updateFolio: folioToUpdate, updateWellId: currentWellId }
                : {}),
            }),
          });

          if (response.ok) {
            const result = await response.json();
            const serverResult = result.results?.[0];
            if (result.success && serverResult?.success) {
              const realFolio = serverResult.folio || "00";
              const realFolioToCancel = serverResult.folioToCancel || "00";
              const wellWithRealFolio = {
                ...wellToSave,
                folio: realFolio,
                folioToCancel: realFolioToCancel,
              };

              setWells((prev) =>
                prev.map((w) => (w.id === currentWellId ? wellWithRealFolio : w))
              );

              clearEditingFolio();

              showAlert(
                "Enregistrement Réussi",
                isUpdatingFolio
                  ? `Le Folio N° ${realFolio} de ${wellWithRealFolio.name} a été mis à jour.`
                  : `Les données du puits ${wellWithRealFolio.name} ont été enregistrées. Nouveau Folio N°: ${realFolio}`
              );

              try {
                const hRes = await fetch(`/api/supabase/well-history/${currentWellId}`);
                if (hRes.ok) {
                  const hData = await hRes.json();
                  if (hData.success) {
                    setHistoryCache((prev) => ({
                      ...prev,
                      [currentWellId]: hData.history || [],
                    }));
                  }
                }
              } catch (hErr) {
                console.warn("Could not refresh history on save:", hErr);
              }
            } else {
              showAlert(
                "Erreur de Sauvegarde",
                result.error || result.results?.[0]?.error || "Impossible de sauvegarder."
              );
            }
          } else {
            showAlert(
              "Erreur de Sauvegarde",
              "Une erreur est survenue lors de la sauvegarde."
            );
          }
        } catch (err) {
          showAlert(
            "Erreur de Connexion",
            "Impossible de contacter le serveur de base de données."
          );
        } finally {
          setIsManualSaving(false);
        }
      }
    );
  };

  // Export Well Data as a JSON file
  const exportWellJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(wells, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `wellbore_schematic_export_${new Date().toISOString().slice(0, 10)}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Clear all data
  const clearAllData = () => {
      const newWell: WellData = {
        id: `well-${Date.now()}`,
        name: `NEW WELL`,
        purpose: "Oil Producer",
        completionType: "COMPLETION SIMPLE",
        reservoir: "",
        field: "",
        elevationSol: 0,
        elevationForage: 0,
        elevationProduction: 0,
        folio: "00",
        folioToCancel: "00",
        casings: [],
        tubings: [],
        perforations: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setWells([newWell]);
      setActiveWellId(newWell.id);
      clearEditingFolio();
  };

  // Import Well Data from JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
            setWells(parsed);
            setActiveWellId(parsed[0].id);
            showAlert("Import Successful", "Wellbore completion library imported successfully!");
          } else {
            showAlert("Import Failed", "Invalid format. Expected an array of well completions.");
          }
        } catch (error) {
          showAlert("Import Error", "Error parsing JSON file. Please verify its content.");
        }
      };
    }
  };

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  return (
    <div
      className="min-h-screen md:h-screen md:overflow-hidden bg-[#f8fafc] text-slate-800 flex flex-col md:flex-row font-sans"
      id="app_root"
    >
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside
        className="w-full md:w-64 lg:w-72 bg-[#121a2d] text-slate-300 shrink-0 flex flex-col justify-between border-r border-slate-800/60 shadow-xl"
        id="app_sidebar"
      >
        <div className="flex flex-col flex-1">
          <div className="p-6 border-b border-slate-800/40 flex items-center gap-3 bg-[#0c1222]">
            <img src="/logo.svg" className="w-9 h-9 object-contain rounded-lg shadow-md" alt="Logo" />
            <div>
              <h1 className="text-white font-extrabold tracking-wider text-sm font-sans uppercase">
                Wellbore Pro
              </h1>
            </div>
          </div>

          {/* Sidebar Nav Links */}
          <div className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-3">
              Navigation Principale
            </p>

            <button
              id="sidebar_tab_dashboard"
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-lg transition-all ${
                activeTab === "dashboard"
                  ? "bg-[#f97316] text-white shadow-md shadow-[#f97316]/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>Tableau de Bord</span>
            </button>

            <button
              id="sidebar_tab_metadata"
              onClick={openFicheTechnique}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-lg transition-all ${
                activeTab === "metadata"
                  ? "bg-[#f97316] text-white shadow-md shadow-[#f97316]/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Fiche Technique</span>
            </button>

            <button
              id="sidebar_tab_history"
              onClick={() => setActiveTab("history")}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-lg transition-all ${
                activeTab === "history"
                  ? "bg-[#f97316] text-white shadow-md shadow-[#f97316]/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <History className="w-4 h-4" />
              <span>Historique</span>
            </button>

            <button
              onClick={() => setActiveTab("custom_tools")}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-bold rounded-lg transition-all text-left ${
                activeTab === "custom_tools"
                  ? "bg-[#f97316] text-white shadow-md shadow-[#f97316]/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>Désignations & Composants</span>
            </button>
          </div>

          {/* Library Section (Bottom half of Sidebar) — Shown only for Admins */}
          {isAdmin && (
            <div className="px-4 py-4 border-t border-slate-800/40 space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
                Bibliothèque
              </p>

              <button
                id="sidebar_action_export"
                onClick={exportWellJson}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[11px] font-bold rounded-md text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all text-left"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exporter Données</span>
              </button>

              <label
                htmlFor="import_json_input_sidebar"
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[11px] font-bold rounded-md text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all text-left cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importer JSON</span>
                <input
                  id="import_json_input_sidebar"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportJson}
                />
              </label>

              <button
                id="sidebar_action_reset"
                onClick={clearAllData}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[11px] font-bold rounded-md text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 transition-all text-left"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Réinitialiser</span>
              </button>
            </div>
          )}
        </div>

        {/* Profile Container at Sidebar bottom (exactly like the picture!) */}
        <div className="p-4 bg-[#0c1222] border-t border-slate-800/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#f97316] text-white font-extrabold flex items-center justify-center text-sm shadow-sm uppercase">
              {currentUser.nom_prenom.includes(" ") ? currentUser.nom_prenom.split(" ")[1].charAt(0) : currentUser.nom_prenom.charAt(0)}
            </div>
            <div>
              <p className="text-xs font-bold text-white font-sans truncate max-w-[120px]" title={currentUser.nom_prenom}>
                {currentUser.nom_prenom.includes(" ") ? currentUser.nom_prenom.split(" ").slice(1).join(" ") : currentUser.nom_prenom}
              </p>
              <p className="text-[9px] text-slate-400 font-bold tracking-wider uppercase font-mono">
                {currentUser.role}
              </p>
            </div>
          </div>
          <button onClick={() => setCurrentUser(null)} className="p-1.5 hover:bg-slate-800 rounded-md transition text-slate-400 hover:text-white" title="Se déconnecter">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </aside>

      {/* RIGHT SIDE CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 md:h-full md:overflow-hidden" id="main_content_wrapper">
        {/* MAIN PAGE HEADER BAR */}
        <header className="px-6 py-6 border-b border-slate-200/60 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight font-sans">
              {activeTab === "dashboard" && "Tableau de Bord des Puits"}
              {activeTab === "history" && "Historique"}
              {activeTab === "metadata" && "Fiche Technique"}
              {activeTab === "custom_tools" && "Désignations & Composants"}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {activeTab === "dashboard" && "Aperçu global, caractéristiques techniques et indicateurs clés de l'ensemble des puits."}
              {activeTab === "history" && "Suivi, consultations et rapports des folios générés pour votre structure."}
              {activeTab === "metadata" && "Suivi, consultations, caractéristiques techniques, architecture de puits, casings, tubings et perforations."}
              {activeTab === "custom_tools" && "Gérez les types de composants tubings et leurs désignations."}
            </p>
          </div>


        </header>

        {/* WORKSPACE & SCHEMATIC WRAPPER */}
        {activeWell ? (
          <main className="flex-1 p-6 space-y-6 overflow-y-auto" id="app_main_content">
            {/* SEARCH & FILTERS BAR ROW */}
            {activeTab !== "dashboard" && activeTab !== "custom_tools" && (
              <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4" id="well_filters_row">
                <div className="flex flex-1 flex-wrap items-center gap-3">
                  {/* Smart Search Bar */}
                  <div className="relative w-full md:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Recherche intelligente..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-orange-500 focus:bg-white transition-all text-slate-800"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Périmètre selector */}
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 gap-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-sans">
                      Périmètre:
                    </span>
                    <select
                      className="bg-transparent text-slate-800 font-bold text-xs focus:outline-none cursor-pointer pr-4 border-none py-0.5"
                      value={selectedPerimeter}
                      onChange={(e) => setSelectedPerimeter(e.target.value)}
                    >
                      <option value="TOUT">TOUS LES PÉRIMÈTRES</option>
                      {uniquePerimeters.map((perm) => (
                        <option key={perm} value={perm}>
                          {perm.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Year picker */}
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 gap-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-sans">
                      Année:
                    </span>
                    <select
                      className="bg-transparent text-slate-800 font-bold text-xs focus:outline-none cursor-pointer pr-4 border-none py-0.5"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                    >
                      <option value="TOUT">TOUTES LES ANNÉES</option>
                      {uniqueYears.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Well select list */}
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 gap-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-sans">
                      Puits Actif:
                    </span>
                    <select
                      id="header_well_selector"
                      className="bg-transparent text-slate-800 font-bold text-xs focus:outline-none cursor-pointer pr-4 border-none py-0.5"
                      value={activeWellId}
                      onChange={(e) => {
                        clearEditingFolio();
                        setActiveWellId(e.target.value);
                      }}
                    >
                      {activeTab === "history" && (
                        <option value="TOUT" className="text-slate-800 bg-white">
                          TOUS LES PUITS
                        </option>
                      )}
                      {filteredWells.map((w) => (
                        <option key={w.id} value={w.id} className="text-slate-800 bg-white">
                          {w.name}
                        </option>
                      ))}
                      {activeWell && activeWellId !== "TOUT" && !filteredWells.some((w) => w.id === activeWellId) && (
                        <option value={activeWellId} className="text-slate-800 bg-white">
                          {activeWell.name}
                        </option>
                      )}
                      {filteredWells.length === 0 && !activeWell && (
                        <option value="" disabled className="text-slate-400 bg-white">
                          Aucun puits
                        </option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Add & Delete Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  {editingFolio?.wellId === activeWellId && (
                    <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                      Modif. Folio {editingFolio.folio}
                    </span>
                  )}
                  <button
                    id="header_btn_create"
                    onClick={createNewWell}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 transition shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter un Puits
                  </button>

                  <button
                    onClick={() => setIsPrintOpen(true)}
                    className="flex items-center justify-center bg-[#f97316] hover:bg-[#ea580c] active:scale-95 text-white p-2.5 rounded-lg transition shadow-xs"
                    title="Imprimer Rapport A4"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  <button
                    onClick={saveWellToDb}
                    disabled={isManualSaving}
                    className={`flex items-center justify-center ${
                      isManualSaving
                        ? "bg-slate-300 cursor-not-allowed text-slate-500"
                        : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white"
                    } p-2.5 rounded-lg transition shadow-xs`}
                    title={
                      isManualSaving
                        ? "Enregistrement..."
                        : editingFolio?.wellId === activeWellId
                          ? `Mettre à jour le Folio N° ${editingFolio.folio}`
                          : "Enregistrer (nouveau folio)"
                    }
                  >
                    <Save className="w-4 h-4" />
                  </button>

                  <button
                    id="header_btn_delete"
                    onClick={deleteActiveWell}
                    className={`bg-slate-50 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-500 text-xs font-bold p-2.5 rounded-lg border border-slate-200 transition ${activeTab === "history" ? "hidden" : ""}`}
                    title="Supprimer le Puits actif"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TWO-COLUMN GRID: TAB CORES AND WELL SCHEMATIC */}
            <div className={activeTab === "dashboard" || activeTab === "history" || activeTab === "custom_tools" ? "w-full" : "grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full"}>
              {/* Left Column: Form Editors */}
              <section className={activeTab === "dashboard" || activeTab === "history" || activeTab === "custom_tools" ? "w-full" : "lg:col-span-7 xl:col-span-7 min-w-0"} id="left_form_workspace">
                <div className="min-h-[500px] flex flex-col" id="tab_panels_scroller">
                  {activeTab === "custom_tools" && (
                    <CustomToolsModal />
                  )}
                  {activeTab === "dashboard" && (
                    <WellDashboard
                      wells={wells}
                      activeWellId={activeWellId}
                      onSelectWell={(id) => setActiveWellId(id)}
                      onNavigateToTab={(tab) => {
                        if (tab === "wellbore") {
                          clearEditingFolio();
                          setActiveTab("metadata");
                          setActiveCategory("architecture");
                        } else if (tab === "perforations") {
                          clearEditingFolio();
                          setActiveTab("metadata");
                          setActiveCategory("perforations");
                        } else {
                          if (tab === "metadata") clearEditingFolio();
                          setActiveTab(tab);
                        }
                      }}
                      onCreateNewWell={createNewWell}
                      onDeleteWell={deleteWell}
                    />
                  )}
                  {activeTab === "metadata" && (
                    <div className="space-y-6">
                      {/* Sub-categories Category Bar */}
                      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/50" id="metadata_subcategories_tabs">
                        <button
                          onClick={() => setActiveCategory("params")}
                          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
                            activeCategory === "params"
                              ? "bg-[#f97316] text-white shadow-sm"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                          }`}
                        >
                          <span>Paramètres</span>
                        </button>
                        
                        <button
                          onClick={() => setActiveCategory("architecture")}
                          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
                            activeCategory === "architecture"
                              ? "bg-[#f97316] text-white shadow-sm"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                          }`}
                        >
                          <span>Wellbore</span>
                        </button>

                        <button
                          onClick={() => setActiveCategory("perforations")}
                          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
                            activeCategory === "perforations"
                              ? "bg-[#f97316] text-white shadow-sm"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                          }`}
                        >
                          <span>Perforations</span>
                        </button>
                      </div>

                      {/* Display the active Category form */}
                      <div className="transition-all duration-300">
                        {activeCategory === "params" && (
                          <WellMetadataForm
                            well={activeWell}
                            onChange={handleWellChange}
                          />
                        )}
                        {activeCategory === "architecture" && (
                          <WellboreForm
                            well={activeWell}
                            onChange={handleWellChange}
                          />
                        )}
                        {activeCategory === "perforations" && (
                          <PerforationForm
                            well={activeWell}
                            onChange={handleWellChange}
                          />
                        )}
                      </div>
                    </div>
                  )}
                  {activeTab === "history" && (
                    <WellHistory
                      wellId={activeWellId}
                      history={displayedHistory}
                      loading={loadingHistory}
                      combinedView={activeWellId === "TOUT"}
                      isAdmin={isAdmin}
                      onEdit={isAdmin ? editHistoryRecord : undefined}
                      onDelete={isAdmin ? deleteHistoryRecord : undefined}
                    />
                  )}
                </div>
              </section>

              {/* Right Column: Schematic Draw Box */}
              {activeTab !== "dashboard" && activeTab !== "history" && activeTab !== "custom_tools" && (
                <section className="lg:col-span-5 xl:col-span-5 w-full min-w-0" id="right_schematic_rail">
                  <div className="sticky top-6" id="sticky_rail_wrapper">
                    <WellboreSchematic well={activeWell} onChange={handleWellChange} />
                  </div>
                </section>
              )}
            </div>
          </main>
        ) : (
          <div
            className="flex-1 flex flex-col items-center justify-center p-8 text-center"
            id="empty_state"
          >
            <Database className="w-12 h-12 text-slate-300 animate-pulse mb-3" />
            <h3 className="font-sans font-bold text-slate-800 text-sm">
              Initializing Wellbore Database...
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Please wait while the platform loads completion tallies and renders
              structural schematics.
            </p>
          </div>
        )}


      </div>

      {/* GLOBAL PRINT MODAL OVERLAY */}
      {isPrintOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900 bg-opacity-60 backdrop-blur-xs overflow-auto flex items-start justify-center p-4">
          <WellboreA4Print
            well={activeWell}
            onClose={() => setIsPrintOpen(false)}
          />
        </div>
      )}

      {/* Custom Dialog Modal */}
      {dialog && dialog.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="custom_dialog_modal">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-sans">{dialog.title}</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{dialog.message}</p>
            </div>
            <div className="flex justify-end gap-2.5">
              {dialog.type === "confirm" && (
                <button
                  type="button"
                  onClick={() => setDialog(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (dialog.type === "confirm" && dialog.onConfirm) {
                    dialog.onConfirm();
                  }
                  setDialog(null);
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg transition ${
                  dialog.type === "confirm" && dialog.title.includes("Delete")
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-[#f97316] hover:bg-[#ea580c]"
                }`}
              >
                {dialog.type === "confirm" ? "Confirm" : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
    </div>
  );
}
