import React, { useState, useEffect } from 'react';
import { WellData, CasingString, TubingComponent, TubingComponentType } from '../types';
import { parseSizeToNumber, calculateCoteProducts, recalculateBottomDepths, getTubingTypeDefaults } from '../lib/wellboreEngine';
import { Layers, Plus, Trash2, ArrowUp, ArrowDown, RefreshCw, Check, Edit, Disc, AlignJustify, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


interface WellboreFormProps {
  well: WellData;
  onChange: (updatedWell: WellData) => void;
}

// Helper component for sortable row
function SortableTubingRow({ t, cote, onEdit, onDelete }: { key?: React.Key, t: TubingComponent, cote: number, onEdit: () => void, onDelete: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: t.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-slate-50/50 bg-white">
      <td className="px-1 py-2.5 cursor-grab" {...attributes} {...listeners}>
        <GripVertical className="w-4 h-4 text-slate-400" />
      </td>
      <td className="px-3 py-2.5">
        <span className="font-semibold text-slate-800">{t.name}</span>
      </td>
      <td className="px-2 py-2.5 text-center font-medium text-slate-700">{t.qty || '01'}</td>
      <td className="px-2 py-2.5 text-center font-mono text-slate-600">{t.customType || '-'}</td>
      <td className="px-2 py-2.5 text-center font-mono font-medium text-slate-600">{t.od}</td>
      <td className="px-2 py-2.5 text-right font-mono text-slate-600">{t.length.toFixed(2)}</td>
      <td className="px-2 py-2.5 text-right font-mono font-bold text-slate-800">{t.isCoteProductAdded ? cote.toFixed(2) : ''}</td>
      <td className="px-2 py-2.5 text-center font-mono text-slate-600">{t.minId || '-'}</td>
      <td className="px-3 py-2.5 text-xs text-slate-500 truncate max-w-[180px]" title={t.observations}>
        {t.observations || '-'}
      </td>
      <td className="px-3 py-2.5 text-right">
        <div className="flex justify-end gap-2.5">
          <button type="button" onClick={onEdit} className="text-sky-500 hover:text-sky-600 transition" title="Edit Tubing Component">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onDelete} className="text-slate-400 hover:text-rose-600 transition" title="Delete Tubing Component">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function WellboreForm({ well, onChange }: WellboreFormProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = well.tubings.findIndex(t => t.id === active.id);
      const newIndex = well.tubings.findIndex(t => t.id === over.id);
      onChange({ ...well, tubings: arrayMove(well.tubings, oldIndex, newIndex), updatedAt: new Date().toISOString() });
    }
  };

  // Tubing edit state
  const [editingTubingId, setEditingTubingId] = useState<string | null>(null);
  const [newTubing, setNewTubing] = useState<Partial<TubingComponent>>({
    name: "",
    type: 'Tubing',
    qty: '',
    customType: '',
    od: "",
    length: 0,
    bottomDepth: 0,
    isCoteProductAdded: false,
    minId: '',
    observations: ''
  });

  const [formMode, setFormMode] = useState<'tubing' | 'casing'>('casing');
  const [editingCasingId, setEditingCasingId] = useState<string | null>(null);

  const defaultCasing = {
    name: '',
    boreholeSize: undefined,
    casingSize: undefined,
    topDepth: 0,
    shoeDepth: 0,
    drilledDepth: 0,
    topOfCement: undefined,
    grade: '',
    weight: undefined,
    connection: '',
    observations: ''
  };

  const [newCasing, setNewCasing] = useState<Partial<CasingString>>(defaultCasing);
  
  // Production Tubing Parameters - using the new WellData structure
  const handleProdTbgChange = (key: 'od' | 'grade' | 'weight', value: string) => {
    onChange({
      ...well,
      prodTbgParams: {
        ...(well.prodTbgParams || {}),
        [key]: value
      },
      updatedAt: new Date().toISOString()
    });
  };

  // Handle preset types changing to fill defaults


  // Handle preset types changing to fill defaults using the central configuration matrix
  const handleTubingTypeChange = (selectedType: TubingComponentType) => {
    const defaults = getTubingTypeDefaults(selectedType);

    setNewTubing(prev => ({
      ...prev,
      type: selectedType,
      name: defaults.defaultName,
      od: defaults.defaultOd,
      customType: defaults.defaultCustomType,
      minId: defaults.defaultMinId
    }));
  };

  const handleSaveCasing = () => {
    let updatedCasingsList = [...well.casings];
    if (editingCasingId) {
      updatedCasingsList = well.casings.map(c => {
        if (c.id === editingCasingId) {
          return {
            ...c,
            ...newCasing,
            boreholeSize: newCasing.boreholeSize || '',
            casingSize: newCasing.casingSize || '',
            topDepth: parseFloat(String(newCasing.topDepth)) || 0,
            shoeDepth: parseFloat(String(newCasing.shoeDepth)) || 0,
            drilledDepth: parseFloat(String(newCasing.drilledDepth)) || 0,
            weight: parseFloat(String(newCasing.weight)) || 0,
          } as CasingString;
        }
        return c;
      });
      setEditingCasingId(null);
    } else {
      const entry: CasingString = {
        ...(newCasing as CasingString),
        id: `casing-${Date.now()}`,
        boreholeSize: newCasing.boreholeSize || '',
        casingSize: newCasing.casingSize || '',
        topDepth: parseFloat(String(newCasing.topDepth)) || 0,
        shoeDepth: parseFloat(String(newCasing.shoeDepth)) || 0,
        drilledDepth: parseFloat(String(newCasing.drilledDepth)) || 0,
        weight: parseFloat(String(newCasing.weight)) || 0,
      };
      updatedCasingsList = [...updatedCasingsList, entry];
    }
    
    updatedCasingsList.sort((a, b) => parseSizeToNumber(b.casingSize) - parseSizeToNumber(a.casingSize));

    onChange({
      ...well,
      casings: updatedCasingsList,
      updatedAt: new Date().toISOString()
    });
    setNewCasing(defaultCasing);
  };

  const handleSaveTubing = () => {
    let updatedTubingsList = [...well.tubings];
    const hasTubingData = newTubing.name && newTubing.length > 0;

    if (hasTubingData) {
      const length = parseFloat(String(newTubing.length)) || 0;
      const bottomDepth = newTubing.bottomDepth;

      if (editingTubingId) {
        updatedTubingsList = well.tubings.map(t => {
          if (t.id === editingTubingId) {
            return {
              ...t,
              name: newTubing.name || '',
              type: newTubing.type as TubingComponentType,
              od: newTubing.od || '',
              length: length,
              bottomDepth: bottomDepth,
              isCoteProductAdded: bottomDepth !== undefined && bottomDepth !== null && bottomDepth > 0,
              qty: newTubing.qty || '01',
              customType: newTubing.customType || 'EU',
              minId: newTubing.minId || '',
              observations: newTubing.observations || ''
            };
          }
          return t;
        });
        setEditingTubingId(null);
      } else {
        const entry: TubingComponent = {
          id: `tubing-${Date.now()}`,
          name: newTubing.name || '',
          type: (newTubing.type as TubingComponentType) || 'Tubing',
          od: newTubing.od || '',
          length: length,
          bottomDepth: bottomDepth,
          isCoteProductAdded: bottomDepth !== undefined && bottomDepth !== null && bottomDepth > 0,
          qty: newTubing.qty || '01',
          customType: newTubing.customType || 'EU',
          minId: newTubing.minId || '',
          observations: newTubing.observations || ''
        };
        updatedTubingsList = [...updatedTubingsList, entry];
      }

      setNewTubing({
        name: "",
        type: 'Tubing',
        qty: '',
        customType: '',
        od: "",
        length: 0,
        bottomDepth: 0,
        isCoteProductAdded: false,
        minId: '',
        observations: ''
      });
      
      onChange({
        ...well,
        tubings: updatedTubingsList,
        updatedAt: new Date().toISOString()
      });
    }
  };

  // ==================== SEPARATE ACTIONS (DELETE/MOVE) ====================
  const removeTubing = (id: string) => {
    onChange({
      ...well,
      tubings: well.tubings.filter(t => t.id !== id),
      updatedAt: new Date().toISOString()
    });
  };

  const moveTubing = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === well.tubings.length - 1) return;

    const newTubings = [...well.tubings];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    
    const temp = newTubings[index];
    newTubings[index] = newTubings[targetIdx];
    newTubings[targetIdx] = temp;

    // Auto-recalculate bottom depths sequentially using the core engine
    const reordered = recalculateBottomDepths(newTubings);

    onChange({
      ...well,
      tubings: reordered,
      updatedAt: new Date().toISOString()
    });
  };



  const [componentTypes, setComponentTypes] = useState<{ value: string; label: string }[]>([
    { value: 'Tubing', label: 'Tubing' }
  ]);

  useEffect(() => {
    const fetchComponentTypes = async () => {
      try {
        const response = await fetch("/api/supabase/custom-tool-types");
        const json = await response.json();
        if (json.success && json.data && json.data.length > 0) {
          setComponentTypes(json.data.map((item: any) => ({
            value: item.type,
            label: item.french_designation || item.type
          })));
        }
      } catch (error) {
        console.error("Failed to fetch component types:", error);
      }
    };
    fetchComponentTypes();
  }, []);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-6 w-full" id="wellbore_form_root">
      
      {/* TOGGLE FORM MODE */}
      <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
        <button
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-md transition ${formMode === 'casing' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => { setFormMode('casing'); setEditingTubingId(null); }}
        >
          <Disc className="w-4 h-4 text-slate-400" />
          Casing Phase
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-md transition ${formMode === 'tubing' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => { setFormMode('tubing'); setEditingCasingId(null); }}
        >
          <AlignJustify className="w-4 h-4 text-slate-400" />
          Tubing Component
        </button>
      </div>

      {formMode === 'casing' && (
        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              {editingCasingId ? 'Edit Casing Phase' : 'Add Casing Phase'}
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Casing Name</label>
              <input
                type="text"
                placeholder="e.g. Surface Casing"
                className="w-full h-8 px-2 text-xs border border-slate-200 rounded focus:border-slate-400 focus:ring-0 outline-none font-medium bg-white"
                value={newCasing.name || ''}
                onChange={(e) => setNewCasing(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Hole Size (")</label>
              <input
                type="text"
                placeholder="12.25 or 12&quot; 1/4"
                className="w-full h-8 px-2 text-xs border border-slate-200 rounded focus:border-slate-400 focus:ring-0 outline-none bg-white font-mono"
                value={newCasing.boreholeSize || ''}
                onChange={(e) => setNewCasing(prev => ({ ...prev, boreholeSize: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Depth (m)</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  className="w-1/2 h-8 px-2 text-xs border border-slate-200 rounded focus:border-slate-400 focus:ring-0 outline-none bg-white font-mono text-emerald-800"
                  value={newCasing.topDepth ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewCasing(prev => ({ ...prev, topDepth: val === '' ? undefined : parseFloat(val) }));
                  }}
                />
                <span className="text-slate-400 text-xs">-</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="405"
                  className="w-1/2 h-8 px-2 text-xs border border-slate-200 rounded focus:border-slate-400 focus:ring-0 outline-none bg-white font-mono text-emerald-800"
                  value={newCasing.drilledDepth ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewCasing(prev => ({ ...prev, drilledDepth: val === '' ? undefined : parseFloat(val) }));
                  }}
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Casing Size (")</label>
              <input
                type="text"
                placeholder="9.625 or 9&quot; 5/8"
                className="w-full h-8 px-2 text-xs border border-slate-200 rounded focus:border-slate-400 focus:ring-0 outline-none bg-white font-mono"
                value={newCasing.casingSize || ''}
                onChange={(e) => setNewCasing(prev => ({ ...prev, casingSize: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Weight (lb/ft)</label>
              <input
                type="number"
                step="0.1"
                placeholder="36"
                className="w-full h-8 px-2 text-xs border border-slate-200 rounded focus:border-slate-400 focus:ring-0 outline-none bg-white font-mono"
                value={newCasing.weight ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewCasing(prev => ({ ...prev, weight: val === '' ? undefined : parseFloat(val) }));
                }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Steel Grade</label>
              <input
                type="text"
                placeholder="J55"
                className="w-full h-8 px-2 text-xs border border-slate-200 rounded focus:border-slate-400 focus:ring-0 outline-none bg-white text-center font-mono"
                value={newCasing.grade || ''}
                onChange={(e) => setNewCasing(prev => ({ ...prev, grade: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Connection</label>
              <input
                type="text"
                placeholder="BTC"
                className="w-full h-8 px-2 text-xs border border-slate-200 rounded focus:border-slate-400 focus:ring-0 outline-none bg-white text-center font-mono"
                value={newCasing.connection || ''}
                onChange={(e) => setNewCasing(prev => ({ ...prev, connection: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Casing Shoe (Sabot) (m)</label>
              <input
                type="number"
                step="0.01"
                placeholder="400"
                className="w-full h-8 px-2 text-xs border border-slate-200 rounded focus:border-slate-400 focus:ring-0 outline-none bg-white font-mono text-emerald-800"
                value={newCasing.shoeDepth ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewCasing(prev => ({ ...prev, shoeDepth: val === '' ? undefined : parseFloat(val) }));
                }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Top of Cement (TOC) (m)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0"
                className="w-full h-8 px-2 text-xs border border-slate-200 rounded focus:border-slate-400 focus:ring-0 outline-none bg-white font-mono text-slate-700"
                value={newCasing.topOfCement ?? ''}
                onChange={(e) => setNewCasing(prev => ({ ...prev, topOfCement: isNaN(parseFloat(e.target.value)) ? null : parseFloat(e.target.value) }))}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Top of Liner (TOL) (m)</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 1000"
                className="w-full h-8 px-2 text-xs border border-slate-200 rounded focus:border-slate-400 focus:ring-0 outline-none bg-white font-mono text-slate-700"
                value={newCasing.topOfLiner ?? ''}
                onChange={(e) => setNewCasing(prev => ({ ...prev, topOfLiner: isNaN(parseFloat(e.target.value)) ? null : parseFloat(e.target.value) }))}
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveCasing}
              className="h-9 px-6 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs uppercase tracking-wider rounded-lg transition shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {editingCasingId ? 'Save Phase' : 'Add Phase'}
            </button>
          </div>
        </div>
      )}

      {formMode === 'tubing' && (
        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              {editingTubingId ? 'Edit Tubing Component' : 'Add Tubing Component'}
            </h4>
          </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-4 gap-y-3">
          {/* Production Tubing Inputs */}
          <div className="col-span-1 sm:col-span-2 md:col-span-3 xl:col-span-5 pb-3 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <h5 className="col-span-1 sm:col-span-3 text-[10px] font-bold text-slate-500 uppercase">Production Tubing Details</h5>
            <input type="text" placeholder="Ø (e.g. 2''7/8)" className="h-8 px-2 text-xs border border-slate-200 rounded" value={well.prodTbgParams?.od || ''} onChange={(e) => handleProdTbgChange('od', e.target.value)} />
            <input type="text" placeholder="Grade (e.g. J55)" className="h-8 px-2 text-xs border border-slate-200 rounded" value={well.prodTbgParams?.grade || ''} onChange={(e) => handleProdTbgChange('grade', e.target.value)} />
            <input type="text" placeholder="Lbs (e.g. 6.5)" className="h-8 px-2 text-xs border border-slate-200 rounded" value={well.prodTbgParams?.weight || ''} onChange={(e) => handleProdTbgChange('weight', e.target.value)} />
          </div>

          {/* Désignation */}
          <div className="col-span-1 sm:col-span-2 xl:col-span-2">
            <label className="block text-[11px] font-medium text-slate-700 mb-1">Désignation</label>
            <div className="flex gap-2">
              <select
                className="h-8 px-1.5 text-xs border border-slate-200 rounded bg-white w-28 focus:outline-none focus:border-slate-400"
                value={newTubing.type}
                onChange={(e) => handleTubingTypeChange(e.target.value as TubingComponentType)}
              >
                {componentTypes.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.value}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="e.g. Tubing 2''7/8"
                className="flex-1 min-w-0 h-8 px-2 text-xs border border-slate-200 rounded focus:border-slate-400 focus:ring-0 outline-none font-medium bg-white"
                value={newTubing.name || ''}
                onChange={(e) => setNewTubing(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
          </div>

          {/* NB. */}
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">NB.</label>
            <input
              type="text"
              placeholder="01"
              className="w-full h-8 px-2 text-xs border border-slate-200 rounded focus:border-slate-400 focus:ring-0 outline-none bg-white text-center font-bold"
              value={newTubing.qty || ''}
              onChange={(e) => setNewTubing(prev => ({ ...prev, qty: e.target.value }))}
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">Type</label>
            <input
              type="text"
              placeholder="EU"
              className="w-full h-8 px-2 text-xs border border-slate-200 rounded focus:border-slate-400 focus:ring-0 outline-none bg-white text-center font-mono"
              value={newTubing.customType || ''}
              onChange={(e) => setNewTubing(prev => ({ ...prev, customType: e.target.value }))}
            />
          </div>

          {/* Diam */}
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">Diam</label>
            <input
              type="text"
              placeholder="2''7/8"
              className="w-full h-8 px-2 text-xs border border-slate-200 rounded focus:border-slate-400 focus:ring-0 outline-none bg-white text-center font-mono"
              value={newTubing.od || ''}
              onChange={(e) => setNewTubing(prev => ({ ...prev, od: e.target.value }))}
            />
          </div>

          {/* Longueur */}
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">Longueur (m)</label>
            <input
              type="number"
              step="0.01"
              placeholder="1932.14"
              className="w-full h-8 px-2 text-xs border border-slate-200 rounded focus:border-slate-400 focus:ring-0 outline-none bg-white font-mono"
              value={newTubing.length || ''}
              onChange={(e) => setNewTubing(prev => ({ ...prev, length: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          {/* Cote Product */}
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">Cote Product (m)</label>
            <input
              type="number"
              step="0.01"
              placeholder="Auto"
              className="w-full h-8 px-2 text-xs border border-slate-200 rounded focus:border-slate-400 focus:ring-0 outline-none bg-white font-mono text-emerald-800"
              value={newTubing.bottomDepth ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setNewTubing(prev => ({ ...prev, bottomDepth: val === '' ? undefined : parseFloat(val) }));
              }}
            />
          </div>

          {/* Ø Mini */}
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">Ø Mini</label>
            <input
              type="text"
              placeholder="2.441"
              className="w-full h-8 px-2 text-xs border border-slate-200 rounded focus:border-slate-400 focus:ring-0 outline-none bg-white text-center font-mono"
              value={newTubing.minId || ''}
              onChange={(e) => setNewTubing(prev => ({ ...prev, minId: e.target.value }))}
            />
          </div>

          {/* Observations */}
          <div className="col-span-1 sm:col-span-2 md:col-span-3 xl:col-span-5">
            <label className="block text-[11px] font-medium text-slate-700 mb-1">Observations</label>
            <input
              type="text"
              placeholder="Observations/Notes..."
              className="w-full h-8 px-2 text-xs border border-slate-200 rounded focus:border-slate-400 focus:ring-0 outline-none bg-white"
              value={newTubing.observations || ''}
              onChange={(e) => setNewTubing(prev => ({ ...prev, observations: e.target.value }))}
            />
          </div>
        </div>

        {/* ONE SAVE BUTTON */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSaveTubing}
            className="h-9 px-6 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs uppercase tracking-wider rounded-lg transition shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {editingTubingId ? 'Save Changes' : 'Add Component'}
          </button>
        </div>
      </div>
      )}

      {/* CASING PHASES TABLE */}
      {formMode === 'casing' && well.casings.length > 0 && (
        <div className="space-y-3.5 border-t border-slate-100 pt-6">
          <div className="flex items-center gap-2">
            <h3 className="font-sans font-bold text-slate-800 text-sm uppercase tracking-wider">Casing Phases</h3>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 font-bold text-slate-500 uppercase text-[9px] tracking-wider">
                  <th className="px-3 py-2.5">Casing Name</th>
                  <th className="px-2 py-2.5 text-center">Hole Size (")</th>
                  <th className="px-2 py-2.5 text-center">Depth (m)</th>
                  <th className="px-2 py-2.5 text-center">Casing Size (")</th>
                  <th className="px-2 py-2.5 text-center">Weight</th>
                  <th className="px-2 py-2.5 text-center">Grade</th>
                  <th className="px-2 py-2.5 text-center">Connection</th>
                  <th className="px-2 py-2.5 text-right font-bold text-slate-500">Shoe Depth</th>
                  <th className="px-3 py-2.5 text-right w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {well.casings.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 bg-white">
                    <td className="px-3 py-2.5 font-bold text-slate-900">{c.name}</td>
                    <td className="px-2 py-2.5 text-center font-mono text-slate-600">{c.boreholeSize || '-'}</td>
                    <td className="px-2 py-2.5 text-center font-mono text-slate-600">{c.topDepth ?? 0} - {c.drilledDepth || '-'}</td>
                    <td className="px-2 py-2.5 text-center font-mono font-medium text-slate-600">{c.casingSize || '-'}</td>
                    <td className="px-2 py-2.5 text-center font-mono text-slate-600">{c.weight ? `${c.weight} lb/ft` : '-'}</td>
                    <td className="px-2 py-2.5 text-center font-mono text-slate-600">{c.grade || '-'}</td>
                    <td className="px-2 py-2.5 text-center font-mono text-slate-600">{c.connection || '-'}</td>
                    <td className="px-2 py-2.5 text-right font-mono font-bold text-slate-800">{c.shoeDepth.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex justify-end gap-2.5 pr-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFormMode('casing');
                            setEditingCasingId(c.id);
                            setNewCasing(c);
                            document.getElementById('wellbore_form_root')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="text-sky-500 hover:text-sky-600 transition"
                          title="Edit Casing Phase"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newCasings = well.casings.filter(item => item.id !== c.id);
                            onChange({
                              ...well,
                              casings: newCasings,
                              isCasingsCleared: newCasings.length === 0,
                              updatedAt: new Date().toISOString()
                            });
                          }}
                          className="text-slate-400 hover:text-rose-600 transition"
                          title="Delete Casing Component"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TUBING COMPLETION TABLE */}
      {formMode === 'tubing' && (
        <div className="space-y-3.5 border-t border-slate-100 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-sans font-bold text-slate-800 text-sm uppercase tracking-wider">Tubing Components</h3>
            </div>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 font-bold text-slate-500 uppercase text-[9px] tracking-wider">
                    <th className="w-10"></th>
                    <th className="px-3 py-2.5">Désignation</th>
                    <th className="px-2 py-2.5 text-center w-14">NB.</th>
                    <th className="px-2 py-2.5 text-center w-14">TYPE</th>
                    <th className="px-2 py-2.5 text-center w-20">Diam</th>
                    <th className="px-2 py-2.5 text-right w-24">Longueur (m)</th>
                    <th className="px-2 py-2.5 text-right w-28 font-bold text-slate-500">COTE PRODUCT</th>
                    <th className="px-2 py-2.5 text-center w-24">Ø MINI</th>
                    <th className="px-3 py-2.5">Observations</th>
                    <th className="px-3 py-2.5 text-right w-20">Actions</th>
                  </tr>
                </thead>
                <SortableContext items={well.tubings.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <tbody className="divide-y divide-slate-100">
                    {calculateCoteProducts(well.tubings, well.spoolProd).map((t) => {
                      return (
                        <SortableTubingRow 
                          key={t.id} 
                          t={t} 
                          cote={t.calculatedCote} 
                          onEdit={() => {
                              setFormMode('tubing');
                              setEditingTubingId(t.id);
                              setNewTubing(t);
                              document.getElementById('wellbore_form_root')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          onDelete={() => removeTubing(t.id)}
                        />
                      );
                    })}
                    <tr className="bg-slate-100 font-bold border-t border-slate-200">
                      <td className="px-3 py-2.5" colSpan={5}></td>
                      <td className="px-2 py-2.5 text-right font-mono text-slate-800">{well.tubings.reduce((sum, t) => sum + (t.length || 0), 0).toFixed(2)}</td>
                      <td colSpan={4}></td>
                    </tr>
                  </tbody>
                </SortableContext>
              </table>
            </DndContext>
          </div>
        </div>
      )}

    </div>
  );
}
