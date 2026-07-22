import React, { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { WellData, CasingString, TubingComponent, PerforationZone } from '../types';
import {
  parseSizeToNumber,
  formatDepth,
  formatCasingSize,
  computeSchematicFull,
  activeCasingRadius,
  mapDepthToYRaw as mapDepthToYRawCore,
  mapDepthToY as mapDepthToYCore,
  getFrenchDesignation,
  getFrenchType,
  calculateCoteProducts,
  resolveTubingConfig,
  getImageSourceHeight,
  parseViewBoxSize,
} from '../lib/wellboreEngine';
import { Printer, X, Download, FileText, ExternalLink, Ruler } from 'lucide-react';

interface WellboreA4PrintProps {
  well: WellData;
  onClose: () => void;
  hideSchematic?: boolean;
}

export default function WellboreA4Print({ well: wellProp, onClose, hideSchematic }: WellboreA4PrintProps) {
  // Defensive: if snapshot arrives as a JSON string (double-encoded), parse it
  const well: WellData = typeof wellProp === 'string' ? JSON.parse(wellProp as unknown as string) : wellProp;
  const printAreaRef = useRef<HTMLDivElement>(null);

  const [scaleMode, setScaleMode] = useState<'compact' | 'linear'>(() => {
    try {
      const mode = new URLSearchParams(window.location.search).get("scaleMode");
      return (mode === 'linear' || mode === 'compact') ? mode : 'compact';
    } catch {
      return 'compact';
    }
  });

  const handlePrint = () => {
    window.focus();
    window.print();
  };

  const isEmbedded = (() => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  })();

  const newTabUrl = (() => {
    try {
      return window.location.origin + window.location.pathname + `?print=true&scaleMode=${scaleMode}`;
    } catch {
      return `?print=true&scaleMode=${scaleMode}`;
    }
  })();

  // Helper to get pressure input or empty if none
  const getPressureDisplay = (pressure: string | undefined): string => {
    return pressure || '';
  };

  // Helper to get brand input or empty if none
  const getBrandDisplay = (brand: string | undefined): string => {
    return brand || '';
  };

  // Map depths to standard vertical Y coordinate in blueprint drawing
  const svgWidth = 350;
  const svgHeight = 940;
  const xCenter = 150;

  const { schematic, layout } = React.useMemo(
    () => computeSchematicFull(well, 'print', scaleMode),
    [well, scaleMode]
  );
  const { maxDepth, keyAnchors, computedTools } = schematic;
  const { tbgBottomDepth, tbgVisualYBottom, tubingSegments } = layout;

  const completionBackbones = React.useMemo(() => {
    const isTubingLike = (t: string) => t === 'Tubing' || t === 'Tubing Court';
    const completion = computedTools
      .filter((t) => !isTubingLike(t.effectiveType))
      .sort((a, b) => (a.bottomDepth || 0) - (b.bottomDepth || 0));
    const ranges: { yStart: number; yEnd: number }[] = [];
    let groupStart = 0;
    for (let i = 1; i <= completion.length; i++) {
      const breakCluster =
        i === completion.length ||
        (completion[i].bottomDepth || 0) - (completion[groupStart].bottomDepth || 0) >= 150;
      if (breakCluster) {
        const group = completion.slice(groupStart, i);
        if (group.length > 0) {
          ranges.push({
            yStart: Math.min(...group.map((t) => t.visualYTop ?? 0)),
            yEnd: Math.max(...group.map((t) => t.visualYBottom ?? 0)),
          });
        }
        groupStart = i;
      }
    }
    return ranges;
  }, [computedTools]);

  const renderPrintTubingColumn = (yStart: number, yEnd: number, key: string, tbgR: number) => {
    const segHeight = yEnd - yStart;
    if (segHeight <= 0) return null;
    return (
      <g key={key}>
        <rect x={xCenter - tbgR} y={yStart} width={tbgR * 2} height={segHeight} fill="#ffffff" />
        <rect x={xCenter - tbgR} y={yStart} width={tbgR * 2} height={segHeight} fill="url(#tubing-pattern-print)" />
        <line x1={xCenter - tbgR} y1={yStart} x2={xCenter - tbgR} y2={yEnd} stroke="#000" strokeWidth="1.5" />
        <line x1={xCenter + tbgR} y1={yStart} x2={xCenter + tbgR} y2={yEnd} stroke="#000" strokeWidth="1.5" />
      </g>
    );
  };

  const mapDepthToYRaw = (depth: number | string): number => {
    return mapDepthToYRawCore(depth, scaleMode, maxDepth, keyAnchors, 50, 915);
  };

  // Calculate Cote Product for tubing table
  const tubingsForTable = calculateCoteProducts(well.tubings, well.spoolProd);

  const topmostPerf = React.useMemo(() => {
    if (!well.perforations || well.perforations.length === 0) return null;
    return well.perforations.reduce((min, p) => ((p.topDepth || 0) < (min.topDepth || 0) ? p : min), well.perforations[0]);
  }, [well.perforations]);

  const mapDepthToY = (depth: number | string): number => {
    return mapDepthToYCore(
      depth,
      scaleMode,
      maxDepth,
      keyAnchors,
      50,
      915,
      tbgBottomDepth,
      tbgVisualYBottom,
      svgHeight
    );
  };

  const printCasingsData = layout.casings.map((cd) => {
    const casing = well.casings[cd.casingIndex];
    return { casing, i: cd.casingIndex, csgR: cd.casingR, holeR: cd.boreholeR, yTop: cd.yTop, yShoe: cd.yShoe, yDrilled: cd.yDrilled, yTOC: cd.yToc, hasCement: cd.hasCement, tocVal: cd.tocVal, hasLiner: cd.hasLiner, tolVal: cd.tolVal, yTOL: cd.yTol };
  });

  const sortedCasings = layout.sortedCasingIndices.map((i) => well.casings[i]);
  const surfaceCsg = sortedCasings.find(c => (c.name || '').toLowerCase().includes('surface') || parseSizeToNumber(c.casingSize) > 9);
  const prodCsg = sortedCasings.find(c => (c.name || '').toLowerCase().includes('production') || (parseSizeToNumber(c.casingSize) > 5 && parseSizeToNumber(c.casingSize) < 8));

  // Observations fallbacks
  const observationText = well.observations || '';

  // Find primary production tubing component dynamically
  const primaryTbg = well.tubings.find(t => t.type === 'Tubing' && t.length > 100) || well.tubings.find(t => t.type === 'Tubing');
  const parsedTbgInfo = (() => {
    if (!primaryTbg) return null;
    
    let od = primaryTbg.od || '';
    let grade = '';
    let weight = '';
    
    const obs = primaryTbg.observations || '';
    const parts = obs.split('-').map(p => p.trim());
    
    if (parts.length > 0 && parts[0]) {
      if (parts[0].match(/^[A-Z]\d+$/i) || parts[0].includes('J55') || parts[0].includes('N80') || parts[0].includes('L80') || parts[0].includes('P110')) {
        grade = parts[0];
      }
    }
    
    if (parts.length > 1 && parts[1]) {
      const wtMatch = parts[1].match(/[\d\.]+/);
      if (wtMatch) {
        weight = wtMatch[0];
      }
    }
    
    if (!grade) {
      const gMatch = obs.match(/(J55|N80|L80|P110|C90|K55|H40)/i);
      if (gMatch) grade = gMatch[0].toUpperCase();
    }
    if (!weight) {
      const wMatch = obs.match(/([\d\.]+)\s*(#|lbs)/i);
      if (wMatch) weight = wMatch[1];
    }
    
    return { od, grade, weight };
  })();

  // Overlapping Right-Side Labels Resolution Logic
  interface ResolutionLabel {
    id: string;
    targetY: number;
    height: number;
    startX: number;
    markerStart: string;
    renderText: (y: number) => React.JSX.Element;
  }

  const resolvedLabels = (() => {
    const csgLabelList: ResolutionLabel[] = [];
    if (prodCsg) {
      const yTOC = prodCsg.topOfCement !== null ? mapDepthToY(prodCsg.topOfCement || 0) : 280;
      const yShoe = mapDepthToY(prodCsg.shoeDepth || 0);
      const targetY = (yTOC + yShoe) / 2;
      csgLabelList.push({
        id: 'blueprint-prod-csg',
        targetY,
        height: 22,
        startX: xCenter + 25,
        markerStart: 'url(#arrow-left)',
        renderText: (y: number) => (
          <g key="blueprint-prod-csg-text">
            <text x={239} y={y - 2} textAnchor="start" fontSize="11.5" fontWeight="bold">CSG: 7" {prodCsg.grade || 'J55'}</text>
            <text x={239} y={y + 8} textAnchor="start" fontSize="11" fontWeight="semibold" fill="#475569">Weight: {prodCsg.weight || 20} lbs/ft</text>
          </g>
        )
      });
    }

    const toolLabels: ResolutionLabel[] = computedTools.map((tool) => {
      const yBottom = tool.visualYBottom;
      const yTop = tool.visualYTop;
      const height = tool.visualHeight;
      const effectiveType = tool.effectiveType;

      const config = resolveTubingConfig(effectiveType, tool.name);
      if (!config) return null;

      let targetY = (yTop + yBottom) / 2;
      let startX = xCenter + 5;
      let markerStart = 'url(#arrow-left)';

      if (config.type === 'Packer') {
        const drawHeight = Math.max(35, height);
        targetY = yTop + (277 / 635) * drawHeight;
        startX = xCenter + 15;
      } else if (config.type === 'Side-pocket Mandrel') {
        startX = xCenter + 15;
      } else if (config.type === 'Seating Nipple') {
        targetY = yTop + height / 2;
        startX = xCenter + 10;
      } else if (config.type === 'Shoe') {
        targetY = yBottom;
      } else if (config.type === 'Reduction') {
        markerStart = 'url(#dot)';
      }

      // Format texts
      let prefix = config.frenchDesignation;
      if (config.type === 'Seating Nipple') {
        prefix = '= Siège';
      } else if (config.type === 'Shoe') {
        prefix = '▼ Sabot';
      } else if (config.type === 'Reduction') {
        prefix = 'Réd';
      } else if (config.type === 'Tailpipe') {
        prefix = 'Tube de queue';
      } else if (config.type === 'Anchor-seal') {
        prefix = 'Ancrage';
      } else if (config.type === 'Tubing Court') {
        prefix = 'Joint court';
      }

      const isSpecialLabelStyle = ['Packer', 'Seating Nipple', 'Shoe'].includes(config.type);

      return {
        id: `blueprint-${config.type.replace(/\s+/g, '-').toLowerCase()}-${tool.id}`,
        targetY,
        height: 28,
        startX,
        markerStart,
        renderText: (y: number) => {
          if (isSpecialLabelStyle) {
            return (
              <text key={`${tool.id}-lbl`} x={215} y={y + 3.5} textAnchor="start" fontSize="11.5" fontWeight="bold">
                <tspan x={215} dy="0">{prefix} {tool.customType || tool.type}</tspan>
                <tspan x={215} dy="1.2em">{formatDepth(tool.bottomDepth)} m</tspan>
              </text>
            );
          } else {
            return (
              <text key={`${tool.id}-lbl`} x={239} y={y + 3.5} textAnchor="start" fontSize="11.5" fontWeight="bold">
                <tspan x={239} dy="0">{prefix}: {formatDepth(tool.bottomDepth)}m</tspan>
                <tspan x={239} dy="1.2em">Type: {tool.customType || tool.type}</tspan>
              </text>
            );
          }
        }
      };
    }).filter(Boolean) as ResolutionLabel[];

    const allLabels: ResolutionLabel[] = [...toolLabels];

    // Add top hanger label if we have tubings
    if (well.tubings.length > 0) {
      allLabels.push({
        id: 'blueprint-top-hanger',
        targetY: 55,
        height: 20,
        startX: xCenter,
        markerStart: 'url(#dot)',
        renderText: (y: number) => (
          <g key="blueprint-top-hanger-text">
            <text x={225} y={y - 5} textAnchor="start" fontSize="11.5" fontWeight="bold">
              {(() => {
                const val = well.spoolProd || '0.58';
                if (/^[0-9]/.test(val)) {
                  return `+ ${val}`;
                }
                return val;
              })()} Sp.att. tbg
            </text>
          </g>
        )
      });
    }

    const labelsToResolve = allLabels.sort((a, b) => a.targetY - b.targetY);

    const adjusted = labelsToResolve.map(l => ({ ...l, y: l.targetY }));
    const iterations = 100;
    
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < adjusted.length - 1; i++) {
        const current = adjusted[i];
        const next = adjusted[i + 1];
        const requiredDist = (current.height + next.height) / 2 + 8;
        const actualDist = next.y - current.y;
        
        if (actualDist < requiredDist) {
          const overlap = requiredDist - actualDist;
          current.y -= overlap / 2;
          next.y += overlap / 2;
        }
      }
    }
    return adjusted;
  })();

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-50 overflow-y-auto p-4 md:p-8 flex flex-col items-center print:p-0 print:bg-white select-none" id="a4_print_wrapper">
      
      {/* Dynamic Printing Ruleset */}
      <style>{`
         @media print {
           html, body, #root {
             margin: 0 !important;
             padding: 0 !important;
             width: 100% !important;
             height: 100% !important;
             overflow: hidden !important;
             background-color: white !important;
             color: black !important;
             -webkit-print-color-adjust: exact !important;
             print-color-adjust: exact !important;
           }
           #a4_print_wrapper {
             visibility: visible !important;
             display: block !important;
             position: fixed !important;
             left: 0 !important;
             top: 0 !important;
             width: 100% !important;
             height: 100% !important;
             background: white !important;
             padding: 0 !important;
             margin: 0 !important;
             overflow: hidden !important;
             z-index: 99999999 !important;
           }
           #a4_print_wrapper * {
             visibility: visible !important;
           }
           #print_controls_bar, #print_controls_bar * {
             display: none !important;
             visibility: hidden !important;
           }
           .a4-print-card {
             box-shadow: none !important;
             border: none !important;
             margin: 0 !important;
             width: 820px !important;
             height: 1160px !important;
             min-height: 1160px !important;
             position: absolute !important;
             left: 50% !important;
             top: 15px !important;
             transform: translateX(-50%) scale(0.94) !important;
             transform-origin: top center !important;
             page-break-after: avoid !important;
             page-break-inside: avoid !important;
             background-color: white !important;
           }
           @page {
             size: A4 portrait;
             margin: 0;
           }
         }
      `}</style>

      {/* Floater Header bar */}
      <div 
        className="w-[820px] bg-slate-800 border border-slate-700 text-white p-3 rounded-xl mb-4 flex flex-col gap-3 shadow-lg print:hidden" 
        id="print_controls_bar"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-bold font-sans">A4 Professional Technical Card Viewer</h2>
              <p className="text-[12px] text-slate-400 font-mono">Generates Sonatrach 1:1 blueprint matches on A4 print</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Scale Toggle inside Header Bar */}
            <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-700 select-none">
              <span className="text-[12px] uppercase tracking-wider font-mono text-slate-400 px-2 flex items-center gap-1">
                <Ruler className="w-3 h-3 text-emerald-400" />
                Échelle:
              </span>
              <button
                onClick={() => setScaleMode("compact")}
                className={`px-2.5 py-1 text-[13px] font-bold rounded-md transition-all font-sans ${
                  scaleMode === "compact"
                    ? "bg-slate-700 text-white shadow-sm border border-slate-600"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
                title="Focus Scale: Compacts empty intervals, focuses on completion tools"
              >
                Compacte
              </button>
              <button
                onClick={() => setScaleMode("linear")}
                className={`px-2.5 py-1 text-[13px] font-bold rounded-md transition-all font-sans ${
                  scaleMode === "linear"
                    ? "bg-emerald-500 text-white shadow-sm border border-emerald-400/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
                title="True Scale: Spacing matches actual depths linearly"
              >
                Vraie Échelle
              </button>
            </div>

            <div className="flex items-center gap-2">
              {isEmbedded ? (
                <a
                  href={newTabUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 font-sans font-bold text-xs px-4 py-2 rounded-lg text-white transition shadow-sm animate-pulse"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in New Tab to Print
                </a>
              ) : (
                <button
                  id="btn_print_trigger"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 font-sans font-bold text-xs px-4 py-2 rounded-lg text-white transition shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save PDF
                </button>
              )}
              <button
                id="btn_close_print"
                onClick={onClose}
                className="flex items-center gap-1 border border-slate-600 bg-slate-700 hover:bg-slate-600 font-sans font-bold text-xs px-3 py-2 rounded-lg text-white transition"
              >
                <X className="w-3.5 h-3.5" />
                Close
              </button>
            </div>
          </div>
        </div>

        {isEmbedded && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 text-[12px] text-amber-200 flex items-start gap-1.5">
            <span className="text-[14px] leading-none">⚠️</span>
            <p className="font-sans leading-normal">
              <strong>Embedded Sandbox Security Restriction:</strong> Modern web browsers block the standard Print dialog inside sandboxed preview iframes. Click the <strong>"Open in New Tab to Print"</strong> button above to open the application full-screen. Then, click "A4 Print Sheet" and Print there—it will work perfectly!
            </p>
          </div>
        )}
      </div>

      {/* A4 PAPER FRAME: Exact aspect ratio matching 210mm x 297mm */}
      <div 
        ref={printAreaRef}
        className="a4-print-card w-[820px] h-[1164px] min-h-[1164px] bg-white border border-black text-black p-4 relative flex flex-col font-sans shrink-0 print:border-none print:shadow-none"
        id="a4_print_card_element"
      >
        {/* VINTAGE CAD BLUEPRINT BORDER INSETS */}
        <div className="absolute inset-2.5 border border-black pointer-events-none" />
        <div className="absolute inset-3 border-2 border-black pointer-events-none" />

        {/* INNER CONTAINER LAYOUT */}
        <div className="w-full h-full flex flex-col p-2 relative z-10">
          
          {/* I. CARTOUCHE / TECHNICAL CARD HEADER (TOP 2 ROWS) */}
          <div className="w-full border border-black text-[12px] grid grid-cols-12 shrink-0 mb-2 leading-tight" id="cartouche_header_rows">
            {/* Row 1 */}
            <div className="col-span-4 border-r border-b border-black p-1 font-mono font-bold flex justify-start items-baseline gap-1.5">
              <span>Folio N°</span>
              <span className="text-xs font-black">{well.folio || '02'}</span>
            </div>
            <div className="col-span-8 border-b border-black p-1 text-center font-extrabold text-base tracking-[0.25em] font-sans">
              EQUIPEMENT DE PUITS
            </div>

            {/* Row 2 */}
            <div className="col-span-4 border-r border-black p-1.5 flex flex-col justify-center bg-white">
              <span className="text-[11px] font-bold text-black font-mono">WELL/PUITS</span>
              <span className="text-xl font-black text-black font-sans leading-none tracking-tight">{well.name}</span>
            </div>
            <div className="col-span-3 border-r border-black p-1 flex flex-col justify-between items-center text-center">
              <span className="text-[9.5px] font-bold text-black font-mono block self-start">TYPE DE PUITS</span>
              <div className="font-bold text-[11px] text-black uppercase leading-tight">
                <div>Puits Producteur {well.purpose === 'PPG' ? 'Gaz' : 'Huile'}</div>
                <div className="text-black font-extrabold text-[10px] mt-0.5">({well.purpose === 'PPG' ? 'PPG' : 'PPH'})</div>
              </div>
            </div>
            <div className="col-span-3 border-r border-black p-1 flex flex-col justify-between items-center text-center">
              <span className="text-[9.5px] font-bold text-black font-mono block self-start">COMPLETION DESIGN</span>
              <span className="font-bold text-[11.5px] text-black uppercase">{well.completionType || 'COMPLETION SIMPLE'}</span>
            </div>
            <div className="col-span-2 p-1 flex flex-col justify-between items-center text-center">
              <span className="text-[9.5px] font-bold text-black font-mono block self-start">RESERVOIR :</span>
              <span className="font-bold text-[12px] text-black font-mono uppercase">{well.reservoir || 'F6'}</span>
            </div>
          </div>

          {/* II. MAIN SPLIT BODY (Left Column for Tables, Right Column for Drawing) */}
          <div className={`flex-1 w-full grid ${hideSchematic ? 'grid-cols-1' : 'grid-cols-[65fr_35fr]'} gap-x-2.5 min-h-0 overflow-hidden`}>
            
            {/* COLUMN 1: LEFT SIDE - ENGINEERING & HEADERS TABLES */}
            <div className="flex flex-col min-h-0 h-full justify-start gap-y-2">
              
              {/* BOX 1: TETE D'ERUPTION AND VANNES TABLE */}
              <div className="border border-black border-solid flex flex-col shrink-0 bg-white" id="print_tete_deruption_and_vannes">
                <div className="border-b border-black border-solid bg-gray-200 py-1 text-center font-sans font-black text-[10px] uppercase tracking-[0.2em] text-black">
                  TETE D'ERUPTION
                </div>
                
                {/* SINGLE UNIFIED TABLE FOR TETE D'ERUPTION METADATA & VANNES TO ENSURE PERFECT VERTICAL ALIGNMENT */}
                <table className="w-full table-fixed border-collapse text-center font-mono">
                  <colgroup>
                    <col className="w-[15%]" />
                    <col className="w-[17%]" />
                    <col className="w-[17%]" />
                    <col className="w-[17%]" />
                    <col className="w-[17%]" />
                    <col className="w-[17%]" />
                  </colgroup>
                  <tbody>
                    {/* Row 1: TETE D'ERUPTION Metadata Row 1 */}
                    <tr className="text-[9.5px] leading-tight text-left">
                      <td colSpan={2} className="border-r border-b border-black p-1 whitespace-nowrap">
                        <span className="text-black text-[8px] font-bold">Marque :</span>
                        <span className="font-bold text-[9px] text-black ml-1">{getBrandDisplay(well.xmasTreeBrand)}</span>
                      </td>
                      <td className="border-r border-b border-black p-1 whitespace-nowrap">
                        <span className="text-black text-[8px] font-bold">Type :</span>
                        <span className="font-bold text-[9px] text-black ml-1">{well.xmasTreeType || ''}</span>
                      </td>
                      <td colSpan={2} className="border-r border-b border-black p-1 whitespace-nowrap">
                        <span className="text-black text-[8px] font-bold">Ract. Sup. :</span>
                        <span className="font-bold text-[9px] text-black ml-1">{well.xmasTreeRactSup || ''}</span>
                      </td>
                      <td className="border-b border-black p-1 text-center align-middle bg-white font-sans font-black text-[8.5px] uppercase tracking-wider">
                        <span className="text-black font-black">SUSP : </span>
                        <span className="ml-1">{well.suspTbg || 'S./TBG'}</span>
                      </td>
                    </tr>

                    {/* Row 2: TETE D'ERUPTION Metadata Row 2 */}
                    <tr className="text-[9.5px] leading-tight text-left">
                      <td colSpan={2} className="border-r border-b border-black p-1 whitespace-nowrap">
                        <span className="text-black text-[8px] font-bold">Pression :</span>
                        <span className="font-bold text-[9px] text-black ml-1">{getPressureDisplay(well.xmasTreePressure)}</span>
                      </td>
                      <td colSpan={3} className="border-r border-b border-black p-1 whitespace-nowrap">
                        <span className="text-black text-[8px] font-bold">Attache Tbg :</span>
                        <span className="font-bold text-[9px] text-black ml-1">{well.xmasTreeAttacheTbg || ''}</span>
                      </td>
                      <td rowSpan={2} className="border-b border-black p-1 text-left pl-2 align-middle bg-white">
                        <div className="text-left pl-1">
                          <span className="font-mono text-[8px] font-bold text-black block mb-1">Olive :</span>
                          <span className="font-mono text-[8px] font-bold text-black block leading-tight whitespace-pre-line">
                            {well.xmasTreeOlive || ''}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Row 3: TETE D'ERUPTION Metadata Row 3 */}
                    <tr className="text-[9.5px] leading-tight text-left">
                      <td colSpan={2} className="border-r border-b border-black p-1 whitespace-nowrap">
                        <span className="text-black text-[8px] font-bold">Embase :</span>
                        <span className="font-bold text-[9px] text-black ml-1">{well.xmasTreeEmbase || ''}</span>
                      </td>
                      <td colSpan={3} className="border-r border-b border-black p-1 whitespace-nowrap">
                        <span className="text-black text-[8px] font-bold">Réduction :</span>
                        <span className="font-bold text-[8.5px] text-black ml-1 truncate">{well.xmasTreeReduction || ''}</span>
                      </td>
                    </tr>

                    {/* Row 4: VANNES Headers */}
                    <tr className="text-[9px] font-black uppercase bg-white">
                      <td className="border-r border-b border-black p-1 font-sans text-[9px] text-left font-normal bg-gray-200">VANNES</td>
                      <td className="border-r border-b border-black p-1 text-center bg-gray-200">SAS</td>
                      <td className="border-r border-b border-black p-1 text-center bg-gray-200">Maitresse</td>
                      <td className="border-r border-b border-black p-1 text-center bg-gray-200">LAT-TBG</td>
                      <td className="border-r border-b border-black p-1 text-center bg-gray-200">LAT-CSG.</td>
                      <td className="border-l border-b border-black bg-white text-center font-sans font-bold text-[7.5px] text-black px-0.5 py-1 select-none leading-none align-middle">
                        ETAN. S/ TBG - PKR de tête
                      </td>
                    </tr>

                    {/* Row 5: Vannes Marque */}
                    <tr className="text-[9px] font-bold h-[20px]">
                      <td className="border-r border-b border-black p-0.5 font-sans text-left text-[8.5px] uppercase text-black font-normal bg-gray-200">MARQUE</td>
                      <td className="border-r border-b border-black p-0.5 text-black text-center">{well.vannesSasMarque || ''}</td>
                      <td className="border-r border-b border-black p-0.5 text-black text-center">{well.vannesMaitresseMarque || ''}</td>
                      <td className="border-r border-b border-black p-0.5 text-black text-center">{well.vannesLatTbgMarque || ''}</td>
                      <td className="border-r border-b border-black p-0.5 text-black text-center">{well.vannesLatCsgMarque || ''}</td>
                      <td className="border-l border-black bg-white text-center font-mono font-bold text-[9.5px] text-black align-middle py-0.5">
                        {well.packerType || well.etanTbg || '//'}
                      </td>
                    </tr>

                    {/* Row 6: Vannes Nombre */}
                    <tr className="text-[9px] font-bold h-[20px]">
                      <td className="border-r border-b border-black p-0.5 font-sans text-left text-[8.5px] uppercase text-black font-normal bg-gray-200">NOMBRE</td>
                      <td className="border-r border-b border-black p-0.5 text-black font-black text-center">{well.vannesSasNombre || ''}</td>
                      <td className="border-r border-b border-black p-0.5 text-black font-black text-center">{well.vannesMaitresseNombre || ''}</td>
                      <td className="border-r border-b border-black p-0.5 text-black font-black text-center">{well.vannesLatTbgNombre || ''}</td>
                      <td className="border-r border-b border-black p-0.5 text-black font-black text-center">{well.vannesLatCsgNombre || ''}</td>
                      <td rowSpan={2} className="border-l border-black bg-white"></td>
                    </tr>

                    {/* Row 7: Vannes Ø et Série */}
                    <tr className="text-[9px] font-bold h-[20px]">
                      <td className="border-r border-black p-0.5 font-sans text-left text-[8.5px] uppercase text-black font-normal bg-gray-200">Ø et Série</td>
                      <td className="border-r border-black p-0.5 text-black text-center">{well.vannesSasSerie || ''}</td>
                      <td className="border-r border-black p-0.5 text-black text-center">{well.vannesMaitresseSerie || ''}</td>
                      <td className="border-r border-black p-0.5 text-black text-center">{well.vannesLatTbgSerie || ''}</td>
                      <td className="border-r border-black p-0.5 text-black text-center">{well.vannesLatCsgSerie || ''}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* TABLE A: COLONNE TUBING */}
              <div className="border border-black border-solid flex flex-col min-h-0 bg-white mb-2 print-color-adjust" id="print_colonne_tubing_table">
                <div className="border-b border-black border-solid bg-gray-200 py-1 text-center font-sans font-black text-[10px] uppercase tracking-[0.2em] text-black">
                  COLONNE TUBING
                </div>
                
                <div className="flex-1 overflow-hidden">
                  <table className="w-full text-left font-mono text-[10px] border-collapse text-black">
                    <thead>
                      <tr className="border-b border-black border-solid text-[9px] font-bold uppercase bg-gray-200 text-black">
                        <th className="border-r border-black px-1 py-1 text-center w-[65px]">Désignation</th>
                        <th className="border-r border-black px-1 py-1 text-center w-[20px]">Nb.</th>
                        <th className="border-r border-black px-1 py-1 text-center w-[24px]">Type</th>
                        <th className="border-r border-black px-1 py-1 text-center w-[30px]">Diam</th>
                        <th className="border-r border-black px-1 py-1 text-center w-[40px]">Longueur</th>
                        <th className="border-r border-black px-1 py-1 text-center w-[50px]">Cote Product</th>
                        <th className="border-r border-black px-1 py-1 text-center w-[22px]">Ø Mini</th>
                        <th className="px-1 py-1">Observations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tubingsForTable.map((tool, idx) => {
                        const isBlank = !tool.name;
                        const rowMeta = layout.printTableRows.find((r) => r.toolId === tool.id);
                        const displayOd = rowMeta?.displayOd ?? tool.od;
                        const displayType = rowMeta?.displayType ?? getFrenchType(tool.type, tool.name);
                        const qty = rowMeta?.qty ?? (tool.qty || '01');
                        const showsCote = rowMeta?.showsCote ?? (!isBlank && tool.isCoteProductAdded);

                        return (
                          <tr key={tool.id} className="border-b border-black border-solid hover:bg-slate-50 text-[10px] h-[25px] text-black">
                            <td className="border-r border-black border-solid px-1 font-sans font-semibold text-black leading-tight">
                              {isBlank ? '' : tool.name}
                            </td>
                            <td className="border-r border-black border-solid px-1 text-center text-black font-bold">
                              {isBlank ? '' : qty}
                            </td>
                            <td className="border-r border-black border-solid px-1 text-center font-medium text-black">
                              {isBlank ? '' : displayType}
                            </td>
                            <td className="border-r border-black border-solid px-1 text-center font-bold text-black">
                              {isBlank ? '' : displayOd}
                            </td>
                            <td className="border-r border-black border-solid px-1 text-right font-bold text-black">
                              {isBlank ? '' : formatDepth(tool.length)}
                            </td>
                            <td className="border-r border-black border-solid px-1 text-right font-black text-black">
                              {showsCote ? formatDepth((tool as any).calculatedCote) : ''}
                            </td>
                            <td className="border-r border-black border-solid px-1 text-center text-black">
                              {isBlank ? '' : (tool.minId || '')}
                            </td>
                            <td className="px-1 text-black text-[9.5px] font-medium break-words whitespace-normal leading-tight py-0.5" title={tool.observations}>
                              {isBlank ? '' : (tool.observations || '')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TABLE B: PERFORATIONS */}
              <div className="border border-black border-solid flex flex-col shrink-0 bg-white mb-2 print-color-adjust" id="print_perforations_table">
                <div className="border-b border-black border-solid bg-gray-200 py-0.5 text-center font-sans font-black text-[10px] uppercase tracking-[0.2em] text-black">
                  PERFORATIONS
                </div>
                <table className="w-full text-left font-mono text-[10px] border-collapse text-black">
                  <thead>
                    <tr className="border-b border-black border-solid text-[9px] font-bold uppercase bg-gray-200 text-black">
                      <th className="border-r border-black px-1.5 py-0.5 text-center w-[120px]">NIVEAUX PERFORES</th>
                      <th className="border-r border-black px-1 py-0.5 text-center w-[45px]">Hauteur</th>
                      <th className="border-r border-black px-1 py-0.5 text-center w-[70px]">Type de Perfo.</th>
                      <th className="border-r border-black px-1 py-0.5 text-center w-[80px]">Diamètre du Perfo.</th>
                      <th className="border-r border-black px-1 py-0.5 text-center w-[70px]">Densité au m.</th>
                      <th className="border-r border-black px-1 py-0.5 text-center w-[35px]">Calage</th>
                      <th className="px-1.5 py-0.5 text-center w-[60px]">Nbr. de Cps. Tirés</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Display active perfs without padding */}
                    {well.perforations.map((perf, idx) => {
                      const isBlank = !perf;

                      return (
                        <tr key={isBlank ? `blank-perf-${idx}` : perf.id} className="border-b border-black border-solid h-[23px] text-[9.5px] text-black">
                          <td className="border-r border-black border-solid px-1.5 font-bold text-center text-black">
                            {isBlank ? '' : `De ${formatDepth(perf.topDepth)} à ${formatDepth(perf.bottomDepth)}`}
                          </td>
                          <td className="border-r border-black border-solid px-1 text-center font-bold text-black">
                            {isBlank ? '' : `${perf.height % 1 === 0 ? perf.height : parseFloat(perf.height.toFixed(2))}m`}
                          </td>
                          <td className="border-r border-black border-solid px-1 text-center text-black uppercase">
                            {isBlank ? '' : (perf.perfoType || '')}
                          </td>
                          <td className="border-r border-black border-solid px-1 text-center font-bold text-black">
                            {isBlank ? '' : (perf.diameter || "")}
                          </td>
                          <td className="border-r border-black border-solid px-1 text-center text-black">
                            {isBlank ? '' : (perf.density !== undefined ? perf.density : '')}
                          </td>
                          <td className="border-r border-black border-solid px-1 text-center text-black">
                            {isBlank ? '' : (perf.calage || '')}
                          </td>
                          <td className="px-1.5 text-center font-bold text-black">
                            {isBlank ? '' : (perf.shots !== undefined && perf.shots !== null ? (perf.shots % 1 === 0 ? perf.shots : parseFloat(perf.shots.toFixed(2))) : '')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* TABLE C: OBSERVATIONS FOOTNOTES */}
              <div className="border border-black p-1.5 shrink-0 bg-white" id="print_observations_box">
                <span className="text-[10px] font-extrabold text-black uppercase block tracking-wider mb-0.5">OBSERVATIONS :</span>
                <div className="text-[10.5px] leading-relaxed text-slate-700 font-medium italic" dangerouslySetInnerHTML={{ __html: observationText }} />
              </div>

            </div>

            {/* COLUMN 2: RIGHT SIDE - THE GRAPHICAL WELLBORE SCHEMATIC SECTION */}
            <div className={`border border-black bg-white flex flex-col justify-between p-1.5 relative h-full ${hideSchematic ? 'hidden' : ''}`}>
              
              {/* Graphic section title */}
              <div className="border-b border-black pb-1 mb-1 text-center shrink-0">
                <span className="font-sans font-black text-[11.5px] uppercase tracking-wider block text-slate-900">
                  COUPE SCHEMATIQUE DU PUITS
                </span>
                <span className="font-sans font-semibold text-[9.5px] text-slate-600 uppercase block leading-none mt-0.5">
                  Échelle : {scaleMode === 'linear' ? 'Proportionnelle (Vraie Échelle)' : 'Schématique (Focus)'}
                </span>
              </div>

              {/* Elevations & Head Equipment Table */}
              <div className="border border-black grid grid-cols-2 text-[10.5px] font-mono leading-tight mb-2 shrink-0 bg-white">
                {/* Row 1 */}
                <div className="border-r border-b border-black p-1 flex justify-between items-baseline">
                  <span className="text-black font-sans text-[9.5px] font-bold">Z Sol:</span>
                  <span className="font-bold text-black">{formatDepth(well.elevationSol)}</span>
                </div>
                <div className="border-b border-black p-1 flex justify-between items-baseline">
                  <span className="text-black font-sans text-[9.5px] font-bold">Origine cotes:</span>
                  <span className="font-bold text-black truncate max-w-[80px]" title={well.origineCotes || ''}>{well.origineCotes || ''}</span>
                </div>

                {/* Row 2 */}
                <div className="border-r border-b border-black p-1 flex justify-between items-baseline">
                  <span className="text-black font-sans text-[9.5px] font-bold">Z Forage:</span>
                  <span className="font-bold text-black">{formatDepth(well.elevationForage)}</span>
                </div>
                <div className="border-b border-black p-1 flex justify-between items-baseline">
                  <span className="text-black font-sans text-[9.5px] font-bold">Spool Prod:</span>
                  <span className="font-bold text-black truncate max-w-[80px]" title={well.spoolProd || 'CB 15A'}>{well.spoolProd || 'CB 15A'}</span>
                </div>

                {/* Row 3 */}
                <div className="border-r border-black p-1 flex justify-between items-baseline">
                  <span className="text-black font-sans text-[9.5px] font-bold">Z Prod:</span>
                  <span className="font-bold text-black">{formatDepth(well.elevationProduction)}</span>
                </div>
                <div className="p-1"></div>
              </div>

              {/* Dynamic Blueprint Graphic SVG */}
              <div className="flex-1 w-full overflow-hidden flex justify-center relative bg-white pt-2" id="print_canvas_pane">
                <svg
                  id="print_card_vector_schematic"
                  width={svgWidth}
                  height={svgHeight}
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  preserveAspectRatio="xMidYMin meet"
                  className="font-mono"
                  style={{ width: '100%', height: '100%', maxHeight: '950px' }}
                >
                  <defs>
                    {/* True vintage diagonal hatch for concrete cement slurry */}
                    <pattern id="slurry-diagonal" width="10" height="10" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                      <rect width="10" height="10" fill="#cbd5e1" />
                    </pattern>
                    
                    {/* Sand / Sandstone reservoir dotting hatch */}
                    <pattern id="sand-gravel" width="8" height="8" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="0.7" fill="#000000" opacity="0.6" />
                      <circle cx="6" cy="6" r="0.7" fill="#000000" opacity="0.4" />
                      <line x1="1" y1="5" x2="3" y2="7" stroke="#000" strokeWidth="0.4" opacity="0.3" />
                    </pattern>

                    {/* Continuous steel tubing joint pattern */}
                    <pattern id="tubing-pattern-print" x="0" y="0" width="10" height="80" patternUnits="userSpaceOnUse" patternTransform={`translate(${xCenter - 5}, 0)`}>
                      <image href="/img/tubing.svg" x="-31.11" y="0" width="83.33" height="80" preserveAspectRatio="none" />
                    </pattern>

                    {/* Left and right pointing annotations markers */}
                    <marker id="dot" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4">
                      <circle cx="5" cy="5" r="3" fill="#000000" />
                    </marker>
                    <marker id="arrow-left" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M 0 5 L 10 1.5 L 10 8.5 z" fill="#000" />
                    </marker>
                    <marker id="arrow-right" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#000" />
                    </marker>
                  </defs>

                  {/* CENTERLINE (Spans completely down the vertical layout) */}
                  <line x1={xCenter} y1={50} x2={xCenter} y2={svgHeight - 15} stroke="#111" strokeWidth="0.8" strokeDasharray="6,3,1,3" />

                  {/* DYNAMIC FORMATION GEOLOGICAL BACKGROUND (e.g. sand intervals) */}
                  {well.perforations && well.perforations.length > 0 && (() => {
                    const minTopDepth = Math.min(...well.perforations.map(p => p.topDepth || 0));
                    const maxBottomDepth = Math.max(...well.perforations.map(p => p.bottomDepth || 0));
                    const yTop = mapDepthToY(minTopDepth);
                    const yBot = mapDepthToY(maxBottomDepth);
                    
                    const deepestCsg = well.casings && well.casings.length > 0
                      ? well.casings.reduce((max, c) => ((c.shoeDepth || 0) > (max.shoeDepth || 0) ? c : max), well.casings[0])
                      : null;
                    const yCasingShoe = deepestCsg ? mapDepthToY(deepestCsg.shoeDepth || 0) : null;
                    
                    let yBotDotted = yBot + 35;
                    if (yCasingShoe !== null && yBotDotted >= yCasingShoe - 5) {
                      yBotDotted = yCasingShoe - 5;
                    }
                    const rectHeight = yBotDotted - (yTop - 15);

                    const resName = (well.reservoir || 'F6').trim();
                    const formationLabel = resName.toUpperCase().includes('GRS') || resName.toUpperCase().includes('SAND')
                      ? resName
                      : `${resName}`;
                    return (
                      <g key="sand-hatch-overall">
                        {/* Continuous sandstone shading block spanning all perforations */}
                        <rect x={15} y={yTop - 15} width={svgWidth - 30} height={rectHeight} fill="url(#sand-gravel)" opacity="0.12" />
                        
                        {/* Only two boundary lines total, framing the entire formation zone */}
                        <line x1={15} y1={yTop - 15} x2={svgWidth - 15} y2={yTop - 15} stroke="#000" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.5" />
                        <line x1={15} y1={yBotDotted} x2={svgWidth - 15} y2={yBotDotted} stroke="#000" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.5" />
                        
                        {/* Formation label rendered elegantly once at the top of the reservoir */}
                        <text x={35} y={yTop - 15 + rectHeight / 2} fontSize="15" fill="#666" fontStyle="italic" fontWeight="bold">{formationLabel}</text>
                      </g>
                    );
                  })()}

                  {/* CASINGS RENDERING */}
                  {(() => {
                    const casingsData = printCasingsData;

                    // Generate unified Left-Hand Labels list
                    const rawLeftLabels: { 
                      lines: string[]; 
                      targetY: number; 
                      targetX: number; 
                      isTOC?: boolean;
                      isBorehole?: boolean;
                      isShoe?: boolean;
                    }[] = [];

                    casingsData.forEach((cd) => {
                      const { casing, i, csgR, holeR, yTop, yShoe, yDrilled, yTOC, hasCement, tocVal, hasLiner, tolVal, yTOL } = cd;
                      
                      const csgSizeFormatted = formatCasingSize(casing.casingSize);
                      const holeSizeClean = String(casing.boreholeSize).replace(/['"]/g, '').trim();

                      if (i === 0) {
                        // 2. ciment (if hasCement)
                        if (hasCement) {
                          rawLeftLabels.push({
                            lines: ["ciment"],
                            targetY: (yTOC + yShoe) / 2 + 8,
                            targetX: xCenter - (holeR + csgR) / 2,
                            isTOC: true,
                          });
                        }

                        // 3. Sbt: ...
                        rawLeftLabels.push({
                          lines: ["Sbt:", `${formatDepth(casing.shoeDepth)} m`],
                          targetY: yShoe,
                          targetX: xCenter - csgR,
                          isShoe: true,
                        });

                        // 4. foré jusqu' à (drilled depth, if it extends deeper than shoe)
                        if (yDrilled > yShoe + 1) {
                          rawLeftLabels.push({
                            lines: ["foré jusqu' à :", `${formatDepth(casing.drilledDepth)} m`],
                            targetY: yDrilled,
                            targetX: xCenter - holeR,
                          });
                        }
                      } else {
                        // For subsequent casings
                        // 1. TOC (if cement is there)
                        if (hasCement && tocVal !== null) {
                          rawLeftLabels.push({
                            lines: [`TOC ${csgSizeFormatted} :`, `${formatDepth(tocVal)} m`],
                            targetY: yTOC,
                            targetX: xCenter - (holeR + csgR) / 2,
                            isTOC: true,
                          });
                        }

                        // TOL (if liner is there)
                        if (hasLiner && tolVal !== null && yTOL !== null) {
                          rawLeftLabels.push({
                            lines: [`TOL ${csgSizeFormatted} :`, `${formatDepth(tolVal)} m`],
                            targetY: yTOL,
                            targetX: xCenter - (holeR + csgR) / 2,
                          });
                        }

                        // 3. Sabot / Sbt
                        rawLeftLabels.push({
                          lines: [`Sbt:`, `${formatDepth(casing.shoeDepth)} m`],
                          targetY: yShoe,
                          targetX: xCenter - csgR,
                          isShoe: true,
                        });

                        // 4. foré à (drilled depth, if it extends deeper than shoe)
                        if (yDrilled > yShoe + 1) {
                          rawLeftLabels.push({
                            lines: ["foré jusqu' à :", `${formatDepth(casing.drilledDepth)} m`],
                            targetY: yDrilled,
                            targetX: xCenter - holeR,
                          });
                        }
                      }
                    });

                    // Spacing resolution algorithm for Left-Hand Labels to avoid any overlap
                    const spacingY = 18.5; // Since labels can be 2 lines, we increase this to prevent overlap!
                    const resolvedLabels = rawLeftLabels.map((rl) => ({ ...rl, resolvedY: rl.targetY }));
                    
                    // Sort by targetY descending/ascending
                    resolvedLabels.sort((a, b) => a.targetY - b.targetY);

                    // Relax resolvedY coordinates to prevent overlaps
                    for (let iter = 0; iter < 120; iter++) {
                      let changed = false;
                      for (let j = 0; j < resolvedLabels.length - 1; j++) {
                        if (resolvedLabels[j + 1].resolvedY - resolvedLabels[j].resolvedY < spacingY) {
                          const overlap = spacingY - (resolvedLabels[j + 1].resolvedY - resolvedLabels[j].resolvedY);
                          resolvedLabels[j].resolvedY -= overlap / 2;
                          resolvedLabels[j + 1].resolvedY += overlap / 2;
                          changed = true;
                        }
                      }
                      // Keep them within safe vertical boundaries
                      for (let j = 0; j < resolvedLabels.length; j++) {
                        if (resolvedLabels[j].resolvedY < 55) {
                          resolvedLabels[j].resolvedY = 55;
                          changed = true;
                        }
                        if (resolvedLabels[j].resolvedY > svgHeight - 25) {
                          resolvedLabels[j].resolvedY = svgHeight - 25;
                          changed = true;
                        }
                      }
                      if (!changed) break;
                    }

                    return (
                      <g key="all-casings-group">
                        {casingsData.map((cd) => {
                          const { casing, i, csgR, holeR, yTop, yShoe, yDrilled, yTOC, hasCement, hasLiner, yTOL } = cd;
                          const previousCsg = i > 0 ? casingsData[i - 1] : null;
                          const prevShoeY = previousCsg ? previousCsg.yShoe : yTop;
                          const prevDrilledY = previousCsg ? previousCsg.yDrilled : yTop;
                          const prevCsgR = previousCsg ? previousCsg.csgR : holeR;
                          const prevHoleR = previousCsg ? previousCsg.holeR : holeR;
                          const holeYTop = prevDrilledY;
                          return (
                            <g key={`casing-lines-${i}`}>
                              {/* Borehole hole boundary */}
                              <line x1={xCenter - holeR} y1={holeYTop} x2={xCenter - holeR} y2={yDrilled} stroke="#333" strokeWidth="0.8" strokeDasharray="3,2" />
                              <line x1={xCenter + holeR} y1={holeYTop} x2={xCenter + holeR} y2={yDrilled} stroke="#333" strokeWidth="0.8" strokeDasharray="3,2" />
                              {/* Slurry cement shading */}
                              {yTOC !== null && (
                                <>
                                  {/* Left Cement Column (Upper part inside previous casing) */}
                                  {yTOC < prevShoeY && (
                                    <rect x={xCenter - Math.max(holeR, prevCsgR)} y={yTOC} width={Math.max(holeR, prevCsgR) - csgR} height={Math.max(0, prevShoeY - yTOC)} fill="url(#slurry-diagonal)" />
                                  )}
                                  {/* Left Cement Column (Middle part inside previous borehole pocket) */}
                                  {yTOC < prevDrilledY && prevDrilledY > prevShoeY && (
                                    <rect x={xCenter - Math.max(holeR, prevHoleR)} y={Math.max(yTOC, prevShoeY)} width={Math.max(holeR, prevHoleR) - csgR} height={Math.max(0, prevDrilledY - Math.max(yTOC, prevShoeY))} fill="url(#slurry-diagonal)" />
                                  )}
                                  {/* Left Cement Column (Lower part inside current borehole) */}
                                  {yShoe > Math.max(yTOC, prevDrilledY) && (
                                    <rect x={xCenter - holeR} y={Math.max(yTOC, prevDrilledY)} width={holeR - csgR} height={yShoe - Math.max(yTOC, prevDrilledY)} fill="url(#slurry-diagonal)" />
                                  )}
                                  
                                  {/* Right Cement Column (Upper part inside previous casing) */}
                                  {yTOC < prevShoeY && (
                                    <rect x={xCenter + csgR} y={yTOC} width={Math.max(holeR, prevCsgR) - csgR} height={Math.max(0, prevShoeY - yTOC)} fill="url(#slurry-diagonal)" />
                                  )}
                                  {/* Right Cement Column (Middle part inside previous borehole pocket) */}
                                  {yTOC < prevDrilledY && prevDrilledY > prevShoeY && (
                                    <rect x={xCenter + csgR} y={Math.max(yTOC, prevShoeY)} width={Math.max(holeR, prevHoleR) - csgR} height={Math.max(0, prevDrilledY - Math.max(yTOC, prevShoeY))} fill="url(#slurry-diagonal)" />
                                  )}
                                  {/* Right Cement Column (Lower part inside current borehole) */}
                                  {yShoe > Math.max(yTOC, prevDrilledY) && (
                                    <rect x={xCenter + csgR} y={Math.max(yTOC, prevDrilledY)} width={holeR - csgR} height={yShoe - Math.max(yTOC, prevDrilledY)} fill="url(#slurry-diagonal)" />
                                  )}
                                </>
                              )}
                              {/* Casing wall heavy solid lines */}
                              <line x1={xCenter - csgR} y1={yTop} x2={xCenter - csgR} y2={yShoe} stroke="#000" strokeWidth="2.5" />
                              <line x1={xCenter + csgR} y1={yTop} x2={xCenter + csgR} y2={yShoe} stroke="#000" strokeWidth="2.5" />

                              {/* Casing shoe triangles */}
                              <polygon points={`${xCenter - csgR},${yShoe} ${xCenter - csgR - 8},${yShoe} ${xCenter - csgR},${yShoe - 8}`} fill="#000" />
                              <polygon points={`${xCenter + csgR},${yShoe} ${xCenter + csgR + 8},${yShoe} ${xCenter + csgR},${yShoe - 8}`} fill="#000" />

                              {/* Liner Hanger (TOL) */}
                              {hasLiner && yTOL !== null && (
                                <g>
                                  {/* SVG is scaled to width 12 height 16 */}
                                  <image href="/img/liner.svg" x={xCenter - csgR - 6} y={yTOL} width="12" height="16" />
                                  <image href="/img/liner.svg" x={xCenter + csgR - 6} y={yTOL} width="12" height="16" />
                                </g>
                              )}

                              {/* Drilled borehole pocket */}
                              <path d={`M ${xCenter - holeR} ${yShoe} L ${xCenter - holeR} ${yDrilled} Q ${xCenter} ${yDrilled + 6} ${xCenter + holeR} ${yDrilled} L ${xCenter + holeR} ${yShoe}`} fill="none" stroke="#111" strokeWidth="0.8" strokeDasharray="2,2" />
                            </g>
                          );
                        })}

                        {/* RENDER THE UNIFIED RESOLVED LEFT LABELS */}
                        {resolvedLabels.map((lbl, idx) => {
                          const textX = 5; // Static left margin for clean vertical baseline alignment (as requested)
                          const labelEndX = 48; // Label horizontal leader line ending x (compact to avoid borehole overlap)
                          const elbowX = 53; // Label horizontal elbow x

                          return (
                            <g key={`left-lbl-${idx}`}>
                              {/* Multi-line Label Text aligned left (matches hand-drawn style perfectly) */}
                              {lbl.lines.map((lineText, lineIdx) => {
                                const lineY = lbl.lines.length === 1 
                                  ? lbl.resolvedY + 3.5 
                                  : lbl.resolvedY - 3 + (lineIdx * 9.5);
                                return (
                                  <text 
                                    key={`${idx}-line-${lineIdx}`}
                                    x={textX} 
                                    y={lineY} 
                                    fontSize="10" 
                                    fontWeight="bold" 
                                    className="font-sans" 
                                    fill="#000"
                                    textAnchor="start"
                                  >
                                    {lineText}
                                  </text>
                                );
                              })}

                              {/* Beautiful classic CAD leader line */}
                              <path
                                d={`M ${labelEndX} ${lbl.resolvedY} L ${elbowX} ${lbl.resolvedY} L ${lbl.targetX} ${lbl.targetY}`}
                                fill="none"
                                stroke="#000"
                                strokeWidth="0.6"
                                markerEnd="url(#arrow-right)"
                              />
                            </g>
                          );
                        })}
                      </g>
                    );
                  })()}

                  {/* CENTRAL TUBING ELEMENT INNER STRING (Continuous down to bottom Shoe) */}
                  {(() => {
                    const tbgR = 5;

                    return (
                      <g key="tubing-string-blueprint">
                        {tubingSegments.map((seg, sIdx) => {
                          const segHeight = seg.yEnd - seg.yStart;
                          if (segHeight <= 0) return null;
                          return renderPrintTubingColumn(seg.yStart, seg.yEnd, `tbg-seg-print-${sIdx}`, tbgR);
                        })}

                        {/* Tubing through completion clusters (mandrel, nipple, packer, shoe) */}
                        {completionBackbones.map((range, idx) =>
                          renderPrintTubingColumn(range.yStart, range.yEnd, `completion-backbone-print-${idx}`, tbgR)
                        )}

                        {/* STATIC BRACED PRODUCTION CSG LABEL (Exactly like hand-drawn CAD) */}
                        {sortedCasings.filter(c => parseSizeToNumber(c.casingSize) > 2.5).map((csg, index) => {
                          const csgR = parseSizeToNumber(csg.casingSize) * 4.5;
                          const yTOC = csg.topOfCement !== null ? mapDepthToY(csg.topOfCement || 0) : 280;
                          const yShoe = mapDepthToY(csg.shoeDepth || 0);
                          const targetY = (yTOC + yShoe) / 2;
                          
                          // Vertical offset for stack
                          const yOffset = 100 + (index * 120); 

                          return (
                            <g key={`csg-label-${index}`}>
                              <path d={`M ${xCenter + csgR} ${yOffset} H 220`} fill="none" stroke="#000" strokeWidth="0.6" markerStart="url(#arrow-left)" />
                              <text x={224} y={yOffset + 4} fontSize="13" fontWeight="bold" className="font-sans">CSG</text>
                              <text x={250} y={yOffset + 14} fontSize="34" fontWeight="light" fill="#000">{"{"}</text>
                              <g transform={`translate(270, ${yOffset - 18})`} fontSize="13" fontWeight="bold" className="font-sans" fill="#000">
                                <text x={0} y={11}>Ø : {formatCasingSize(csg.casingSize)}</text>
                                <text x={0} y={25}>Gr. : {csg.grade || ''}</text>
                                <text x={0} y={39}>Lbs. : {csg.weight || ''}</text>
                              </g>
                            </g>
                          );
                        })}

                        {/* STATIC BRACED TUBING LABEL (Exactly like hand-drawn CAD) */}
                        {well.prodTbgParams && (
                           <g>
                            <path d={`M ${xCenter + tbgR} 180 H 220`} fill="none" stroke="#000" strokeWidth="0.6" markerStart="url(#arrow-left)" />
                            <text x={224} y={184} fontSize="13" fontWeight="bold" className="font-sans">TBG</text>
                            <text x={250} y={194} fontSize="34" fontWeight="light" fill="#000">{"{"}</text>
                            <g transform="translate(270, 162)" fontSize="13" fontWeight="bold" className="font-sans" fill="#000">
                              <text x={0} y={11}>Ø : {well.prodTbgParams.od || ''}</text>
                              <text x={0} y={25}>Gr. : {well.prodTbgParams.grade || ''}</text>
                              <text x={0} y={39}>Lbs. : {well.prodTbgParams.weight || ''}</text>
                            </g>
                          </g>
                        )}
                      </g>
                    );
                  })()}

                  {/* INTERACTIVE TUBING TOOL ATTACHMENTS (Mandrels, Packers, Reductions, Shoes) */}
                  {computedTools.map((tool, toolIdx) => {
                    const yTop = tool.visualYTop ?? (tool as { visual_y_top?: number }).visual_y_top ?? 0;
                    const yBottom = tool.visualYBottom ?? (tool as { visual_y_bottom?: number }).visual_y_bottom ?? yTop;
                    const height = Math.max(0, tool.visualHeight ?? (tool as { visual_height?: number }).visual_height ?? (yBottom - yTop));
                    const effectiveType = tool.effectiveType;

                    // Dynamically calculate the active inner casing radius at this tool's depth
                    const toolDepth = typeof tool.bottomDepth === "string" ? parseFloat(tool.bottomDepth || "0") : (tool.bottomDepth || 0);
                    const coveringCasings = printCasingsData.filter((cd) => {
                      const top = cd.casing.topDepth || 0;
                      const shoe = cd.casing.shoeDepth || 0;
                      return toolDepth >= top && toolDepth <= shoe;
                    });

                    let activeCsgR = 24.5; // fallback default (e.g. 7" casing * 3.5 = 24.5)
                    if (coveringCasings.length > 0) {
                      coveringCasings.sort((a, b) => a.csgR - b.csgR);
                      activeCsgR = coveringCasings[0].csgR;
                    } else if (printCasingsData.length > 0) {
                      const sorted = [...printCasingsData].sort((a, b) => a.csgR - b.csgR);
                      activeCsgR = sorted[0].csgR;
                    }

                    // Render visual component dynamically from configuration matrix (Approach A)
                    const config = resolveTubingConfig(effectiveType, tool.name);

                    if (config.renderType === 'image') {
                      const drawHeight = Math.max(config.minHeight || 15, height);
                      const scale = config.printScale || 0.25;
                      const { width: vbW, height: vbH } = parseViewBoxSize(config.viewBox);
                      const imgWidth = vbW * scale;
                      const imgX = xCenter - (vbW * 0.4) * scale;
                      return (
                        <g key={`blueprint-img-${tool.id}`}>
                          <svg
                            x={imgX}
                            y={yTop}
                            width={imgWidth}
                            height={drawHeight}
                            viewBox={config.viewBox || "0 0 300 500"}
                            preserveAspectRatio="none"
                          >
                            <image
                              href={config.imageUrl}
                              x="0"
                              y="0"
                              width={vbW}
                              height={vbH}
                              preserveAspectRatio="none"
                              style={config.type === 'Shoe' ? { filter: "brightness(0)" } : undefined}
                            />
                          </svg>
                        </g>
                      );
                    }

                    // Vector drawings for print
                    switch (config.vectorType) {
                      case 'reduction': {
                        return (
                          <g key={`blueprint-reduction-${tool.id}`}>
                            <polygon points={`${xCenter - 6},${yTop} ${xCenter + 6},${yTop} ${xCenter + 4},${yBottom} ${xCenter - 4},${yBottom}`} fill="#cbd5e1" stroke="#000" strokeWidth="1.2" />
                            <line x1={xCenter - 5} y1={yTop} x2={xCenter - 3.8} y2={yBottom} stroke="#000" strokeWidth="0.8" />
                            <line x1={xCenter + 5} y1={yTop} x2={xCenter + 3.8} y2={yBottom} stroke="#000" strokeWidth="0.8" />
                            <polygon points={`${xCenter - 8.5},${yTop + 2} ${xCenter + 8.5},${yTop + 2} ${xCenter},${yBottom - 2}`} fill="none" stroke="#000" strokeWidth="0.8" />
                          </g>
                        );
                      }

                      case 'tailpipe': {
                        return (
                          <g key={`blueprint-tailpipe-${tool.id}`}>
                            <rect x={xCenter - 4} y={yTop} width={8} height={height} fill="#e2e8f0" stroke="#000" strokeWidth="0.8" />
                            <line x1={xCenter - 2} y1={yTop} x2={xCenter - 2} y2={yTop + height} stroke="#000" strokeWidth="0.5" />
                            <line x1={xCenter + 2} y1={yTop} x2={xCenter + 2} y2={yTop + height} stroke="#000" strokeWidth="0.5" />
                            <line x1={xCenter - 4} y1={yTop + height * 0.25} x2={xCenter - 2} y2={yTop + height * 0.25} stroke="#000" strokeWidth="0.8" />
                            <line x1={xCenter + 2} y1={yTop + height * 0.25} x2={xCenter + 4} y2={yTop + height * 0.25} stroke="#000" strokeWidth="0.8" />
                            <line x1={xCenter - 4} y1={yTop + height * 0.5} x2={xCenter - 2} y2={yTop + height * 0.5} stroke="#000" strokeWidth="0.8" />
                            <line x1={xCenter + 2} y1={yTop + height * 0.5} x2={xCenter + 4} y2={yTop + height * 0.5} stroke="#000" strokeWidth="0.8" />
                            <line x1={xCenter - 4} y1={yTop + height * 0.75} x2={xCenter - 2} y2={yTop + height * 0.75} stroke="#000" strokeWidth="0.8" />
                            <line x1={xCenter + 2} y1={yTop + height * 0.75} x2={xCenter + 4} y2={yTop + height * 0.75} stroke="#000" strokeWidth="0.8" />
                          </g>
                        );
                      }

                      case 'anchor-seal': {
                        return (
                          <g key={`blueprint-anchor-${tool.id}`}>
                            <rect x={xCenter - 5.5} y={yTop} width={11} height={height} fill="#e2e8f0" stroke="#000" strokeWidth="0.8" />
                            <rect x={xCenter - 6.5} y={yTop + 1} width={13} height={1.5} fill="#1e293b" stroke="#000" strokeWidth="0.4" />
                            <rect x={xCenter - 6.5} y={yTop + 3.5} width={13} height={1.5} fill="#1e293b" stroke="#000" strokeWidth="0.4" />
                            <g stroke="#000" strokeWidth="0.6" fill="none">
                              <path d={`M ${xCenter - 5.5} ${yTop + 7} L ${xCenter - 4} ${yTop + 8} L ${xCenter - 5.5} ${yTop + 9}`} />
                              <path d={`M ${xCenter + 5.5} ${yTop + 7} L ${xCenter + 4} ${yTop + 8} L ${xCenter + 5.5} ${yTop + 9}`} />
                              <path d={`M ${xCenter - 5.5} ${yTop + 10} L ${xCenter - 4} ${yTop + 11} L ${xCenter - 5.5} ${yTop + 12}`} />
                              <path d={`M ${xCenter + 5.5} ${yTop + 10} L ${xCenter + 4} ${yTop + 11} L ${xCenter + 5.5} ${yTop + 12}`} />
                              <path d={`M ${xCenter - 5.5} ${yTop + 13} L ${xCenter - 4} ${yTop + 14} L ${xCenter - 5.5} ${yTop + 15}`} />
                              <path d={`M ${xCenter + 5.5} ${yTop + 13} L ${xCenter + 4} ${yTop + 14} L ${xCenter + 5.5} ${yTop + 15}`} />
                            </g>
                          </g>
                        );
                      }

                      case 'tubing-court': {
                        return (
                          <g key={`blueprint-court-${tool.id}`}>
                            <rect x={xCenter - 5} y={yTop} width={10} height={height} fill="#e2e8f0" stroke="#000" strokeWidth="0.8" />
                            <rect x={xCenter - 2} y={yTop} width={4} height={height} fill="#000" />
                            <rect x={xCenter - 7} y={yTop} width={14} height={4} fill="#fbbf24" stroke="#000" strokeWidth="0.8" rx="0.5" />
                            <line x1={xCenter - 7} y1={yTop + 2} x2={xCenter + 7} y2={yTop + 2} stroke="#000" strokeWidth="0.5" />
                            <rect x={xCenter - 7} y={yBottom - 4} width={14} height={4} fill="#fbbf24" stroke="#000" strokeWidth="0.8" rx="0.5" />
                            <line x1={xCenter - 7} y1={yBottom - 2} x2={xCenter + 7} y2={yBottom - 2} stroke="#000" strokeWidth="0.5" />
                          </g>
                        );
                      }

                      default: {
                        if (config.type === 'Other' && ((tool.name || '').toLowerCase().includes('olive') || (tool.name || '').toLowerCase().includes('hanger'))) {
                          return (
                            <g key={`blueprint-hanger-${tool.id}`}>
                              <polygon points={`${xCenter - 14},${yTop} ${xCenter + 14},${yTop} ${xCenter + 5},${yBottom} ${xCenter - 5},${yBottom}`} fill="#64748b" stroke="#000" strokeWidth="1" />
                              <rect x={xCenter - 5} y={yTop} width={10} height={height} fill="#ffffff" stroke="#000" strokeWidth="0.8" />
                              <circle cx={xCenter - 9} cy={(yTop + yBottom)/2} r="1.2" fill="#000" />
                              <circle cx={xCenter + 9} cy={(yTop + yBottom)/2} r="1.2" fill="#000" />
                            </g>
                          );
                        }
                        return null;
                      }
                    }
                  })}

                  {/* RESOLVED RIGHT HAND LABELS (Spaced perfectly without overlaps) */}
                  {resolvedLabels.map((label) => {
                    const lineXEnd = 205;
                    const hasSlant = Math.abs(label.y - label.targetY) >= 1;
                    return (
                      <g key={`resolved-label-${label.id}`}>
                        {hasSlant ? (
                          <path
                            d={`M ${label.startX} ${label.targetY} H 215 L 225 ${label.y} H ${lineXEnd}`}
                            fill="none"
                            stroke="#000"
                            strokeWidth="0.8"
                            markerStart={label.markerStart}
                          />
                        ) : (
                          <path
                            d={`M ${label.startX} ${label.targetY} H ${lineXEnd}`}
                            fill="none"
                            stroke="#000"
                            strokeWidth="0.8"
                            markerStart={label.markerStart}
                          />
                        )}
                        {label.renderText(label.y)}
                      </g>
                    );
                  })}

                  {/* ACTIVE INFLOW PERFORATIONS — red conic jets matching interactive schematic */}
                  {(well.perforations.length > 0 ? [{
                    ...well.perforations[0],
                    topDepth: Math.min(...well.perforations.map(p => p.topDepth || 0)),
                    bottomDepth: Math.max(...well.perforations.map(p => p.bottomDepth || 0))
                  }] : []).map((perf, pIdx) => {
                    const yTop = mapDepthToY(perf.topDepth || 0);
                    const yBottom = mapDepthToY(perf.bottomDepth || 0);
                    const height = Math.max(0, yBottom - yTop);

                    // Compute active casing radius at perforation mid-depth
                    const perfMidDepth = ((perf.topDepth || 0) + (perf.bottomDepth || 0)) / 2;
                    const coveringCasings = printCasingsData.filter(cd => {
                      const top = cd.casing.topDepth || 0;
                      const shoe = cd.casing.shoeDepth || 0;
                      return perfMidDepth >= top && perfMidDepth <= shoe;
                    });
                    let perfCsgR = printCasingsData.length > 0
                      ? Math.min(...printCasingsData.map(cd => cd.csgR))
                      : 11;
                    if (coveringCasings.length > 0) {
                      coveringCasings.sort((a, b) => a.csgR - b.csgR);
                      perfCsgR = coveringCasings[0].csgR;
                    }
                    const arrowOuter = perfCsgR + 16;
                    const arrowTip   = arrowOuter + 4;

                    // Recompute conic rows directly from yTop/yBottom (guaranteed alignment)
                    const numConics = height > 0 ? Math.max(2, Math.round(height / 10)) : 1;
                    const step = height > 0 ? height / numConics : 0;
                    const perfRows: number[] = [];
                    for (let k = 0; k < numConics; k++) {
                      perfRows.push(yTop + step * k + step / 2);
                    }

                    return (
                      <g key={`blueprint-perf-${perf.id}`}>
                        {/* Perforation zone highlight */}
                        <rect x={xCenter - arrowOuter} y={yTop} width={arrowOuter * 2} height={height || 2} fill="#dc2626" opacity="0.08" />

                        {/* Conic jets — base at casing wall, tip pointing outward */}
                        {perfRows.map((yVal, rIdx) => (
                          <g key={`shot-${rIdx}`}>
                            {/* Left conic */}
                            <polygon
                              points={`${xCenter - perfCsgR},${yVal - 4} ${xCenter - perfCsgR},${yVal + 4} ${xCenter - arrowTip},${yVal}`}
                              fill="#dc2626"
                              stroke="#991b1b"
                              strokeWidth="0.5"
                              strokeLinejoin="round"
                            />
                            {/* Right conic */}
                            <polygon
                              points={`${xCenter + perfCsgR},${yVal - 4} ${xCenter + perfCsgR},${yVal + 4} ${xCenter + arrowTip},${yVal}`}
                              fill="#dc2626"
                              stroke="#991b1b"
                              strokeWidth="0.5"
                              strokeLinejoin="round"
                            />
                          </g>
                        ))}

                        {/* Top and Bottom perforation depth labels */}
                        {(() => {
                          let textYTop = yTop;
                          let textYBottom = yBottom;
                          const minGap = 15;
                          if (textYBottom - textYTop < minGap) {
                            const midY = (yTop + yBottom) / 2;
                            textYTop = midY - minGap / 2;
                            textYBottom = midY + minGap / 2;
                          }
                          return (
                            <g>
                              <line x1={xCenter + arrowTip + 3} y1={yTop} x2={225} y2={textYTop} stroke="#dc2626" strokeWidth="0.8" markerStart="url(#arrow-left)" />
                              <text x={229} y={textYTop + 3.5} textAnchor="start" fontSize="12.5" fontWeight="black" fill="#dc2626">De: {formatDepth(perf.topDepth)}m</text>

                              <line x1={xCenter + arrowTip + 3} y1={yBottom} x2={225} y2={textYBottom} stroke="#dc2626" strokeWidth="0.8" markerStart="url(#arrow-left)" />
                              <text x={229} y={textYBottom + 3.5} textAnchor="start" fontSize="12.5" fontWeight="black" fill="#dc2626">A: {formatDepth(perf.bottomDepth)}m</text>
                            </g>
                          );
                        })()}
                      </g>
                    );
                  })}

                </svg>
              </div>

              {/* V. SIGNATURES AND OFFICIAL RELEASES BLOCK */}
              <div className="border border-black border-solid p-2 shrink-0 bg-white flex flex-col text-[11px] leading-tight text-black" id="print_signatures_block">
                <div className="flex flex-col space-y-0.5 font-mono">
                  <div>Annule le folio N°: <span className="font-bold">{well.folioToCancel || '01'}</span></div>
                  <div>Mis à jour le : <span className="font-bold">{well.updatedDate ? new Date(well.updatedDate).toLocaleDateString('fr-FR') : (well.updatedAt ? new Date(well.updatedAt).toLocaleDateString('fr-FR') : '')}</span></div>
                  <div>Fin opération le : <span className="font-bold">{well.endOperationDate ? new Date(well.endOperationDate).toLocaleDateString('fr-FR') : '19/02/2007'}</span></div>
                </div>
                <div className="mt-2 pt-1 pb-8 border-t border-black border-solid flex justify-start">
                  <div className="font-serif italic font-bold text-black">Vu {well.vuBy || 'A.HALIM'}</div>
                </div>
              </div>

            </div>
          </div>

          {/* BLUEPRINT FOOTER BAR */}
          <div className="w-full mt-2 pt-2 border-t border-slate-300 flex items-center justify-between text-[9.5px] text-slate-400 shrink-0 font-mono" id="a4_page_footer">
            <span>Enterprise Blueprint utility • Render: Standard A4 portrait sheet (210mm x 297mm) • Form: Sonatrach Equipement du Puits</span>
            <span className="font-bold text-black">Technical Serial: ST-{well.id.toUpperCase().slice(0,8)}</span>
            <span>Sheet 1 of 1</span>
          </div>

        </div>
      </div>
    </div>
  );
}
