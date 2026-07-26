import React, { useState } from 'react';
import { WellData, PerforationZone } from '../types';
import { calculatePerforationFields, savePerforation, removePerforationFromWell } from '../lib/wellboreEngine';
import { Flame, Plus, Trash2, Check, Edit } from 'lucide-react';

interface PerforationFormProps {
  well: WellData;
  onChange: (updatedWell: WellData) => void;
  canAddOrEdit?: boolean;
  canDelete?: boolean;
}

export default function PerforationForm({ well, onChange, canAddOrEdit = true, canDelete = true }: PerforationFormProps) {
  // Perforation edit state
  const [editingPerfId, setEditingPerfId] = useState<string | null>(null);
  const [newPerf, setNewPerf] = useState<Partial<PerforationZone>>({
    topDepth: undefined,
    bottomDepth: undefined,
    height: undefined,
    perfoType: '',
    diameter: '',
    density: undefined,
    calage: '',
    shots: undefined,
    observations: '',
    reservoir: well.reservoir || ''
  });

  // We calculate height and shots on inputs' onChange now so that manual edits to the height field are preserved.

  const handleSavePerf = () => {
    if (
      newPerf.topDepth === undefined ||
      newPerf.bottomDepth === undefined ||
      newPerf.topDepth === null ||
      newPerf.bottomDepth === null ||
      isNaN(newPerf.topDepth) ||
      isNaN(newPerf.bottomDepth)
    ) {
      return;
    }

    const updatedWell = savePerforation(well, newPerf, editingPerfId);
    onChange(updatedWell);

    if (editingPerfId) {
      setEditingPerfId(null);
    }

    setNewPerf({
      topDepth: undefined,
      bottomDepth: undefined,
      height: undefined,
      perfoType: '',
      diameter: '',
      density: undefined,
      calage: '',
      shots: undefined,
      observations: '',
      reservoir: well.reservoir || ''
    });
  };

  const removePerforation = (id: string) => {
    const updatedWell = removePerforationFromWell(well, id);
    onChange(updatedWell);
  };


  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-6 w-full" id="perforation_form_root">
      
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <Flame className="w-5 h-5 text-rose-600 animate-pulse" />
        <h3 className="font-sans font-bold text-slate-800 text-sm uppercase tracking-wider">3. Perforations</h3>
      </div>

      {canAddOrEdit && (
        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 space-y-4 shrink-0">
          <div className="border-b border-slate-200 pb-2">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                {editingPerfId ? "Edit Perforation Zone Data" : "Add Perforation Zone Data"}
              </h4>
              {editingPerfId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingPerfId(null);
                    setNewPerf({ topDepth: undefined, bottomDepth: undefined, height: undefined, perfoType: '', diameter: '', density: undefined, calage: '', shots: undefined, observations: '', reservoir: well.reservoir || '' });
                  }}
                  className="text-[10px] text-slate-400 hover:text-slate-600 font-bold underline capitalize"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>

          {/* ALL PERFORATION INPUTS GROUPED TOGETHER AS REQUESTED BY THE USER */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* input: De */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                De (m) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Top depth"
                className="w-full h-8 px-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded focus:outline-none focus:border-[#f97316]"
                value={newPerf.topDepth !== undefined && newPerf.topDepth !== null ? newPerf.topDepth : ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  const updatedTop = val;
                  const currentBottom = newPerf.bottomDepth;
                  let updatedHeight = newPerf.height;
                  let updatedShots = newPerf.shots;

                  if (updatedTop !== undefined && currentBottom !== undefined && !isNaN(updatedTop) && !isNaN(currentBottom)) {
                    const fields = calculatePerforationFields(updatedTop, currentBottom, newPerf.height, newPerf.density, newPerf.shots);
                    updatedHeight = fields.height;
                    updatedShots = fields.shots;
                  }

                  setNewPerf(prev => ({
                    ...prev,
                    topDepth: val,
                    height: updatedHeight,
                    shots: updatedShots
                  }));
                }}
              />
            </div>

            {/* input: À */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                À (m) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Bottom depth"
                className="w-full h-8 px-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded focus:outline-none focus:border-[#f97316]"
                value={newPerf.bottomDepth !== undefined && newPerf.bottomDepth !== null ? newPerf.bottomDepth : ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  const updatedBottom = val;
                  const currentTop = newPerf.topDepth;
                  let updatedHeight = newPerf.height;
                  let updatedShots = newPerf.shots;

                  if (currentTop !== undefined && updatedBottom !== undefined && !isNaN(currentTop) && !isNaN(updatedBottom)) {
                    const fields = calculatePerforationFields(currentTop, updatedBottom, newPerf.height, newPerf.density, newPerf.shots);
                    updatedHeight = fields.height;
                    updatedShots = fields.shots;
                  }

                  setNewPerf(prev => ({
                    ...prev,
                    bottomDepth: val,
                    height: updatedHeight,
                    shots: updatedShots
                  }));
                }}
              />
            </div>

            {/* input: Réservoir */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Réservoir
              </label>
              <input
                type="text"
                placeholder="ex: F6, TAGI..."
                className="w-full h-8 px-2 text-xs font-bold text-rose-700 bg-white border border-slate-200 rounded focus:outline-none focus:border-[#f97316]"
                value={newPerf.reservoir || ''}
                onChange={(e) => setNewPerf(prev => ({ ...prev, reservoir: e.target.value }))}
              />
            </div>

            {/* input: Hauteur */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Hauteur (m)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Height"
                className="w-full h-8 px-2 text-xs font-mono bg-white border border-slate-200 rounded focus:outline-none focus:border-[#f97316]"
                value={newPerf.height !== undefined && newPerf.height !== null ? newPerf.height : ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  const top = newPerf.topDepth || 0;
                  const bottom = newPerf.bottomDepth || 0;
                  const fields = calculatePerforationFields(top, bottom, val, newPerf.density, newPerf.shots);
                  setNewPerf(prev => ({
                    ...prev,
                    height: val,
                    shots: fields.shots
                  }));
                }}
              />
            </div>

            {/* input: Type de Perfo. */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Type de Perfo.
              </label>
              <input
                type="text"
                placeholder="e.g. CC, TCP"
                className="w-full h-8 px-2 text-xs uppercase bg-white border border-slate-200 rounded focus:outline-none focus:border-[#f97316]"
                value={newPerf.perfoType || ''}
                onChange={(e) => setNewPerf(prev => ({ ...prev, perfoType: e.target.value }))}
              />
            </div>

            {/* input: Diamètre du Perfo. */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Diamètre du Perfo.
              </label>
              <input
                type="text"
                placeholder="e.g. 4''1/2"
                className="w-full h-8 px-2 text-xs font-mono bg-white border border-slate-200 rounded focus:outline-none focus:border-[#f97316]"
                value={newPerf.diameter || ''}
                onChange={(e) => setNewPerf(prev => ({ ...prev, diameter: e.target.value }))}
              />
            </div>

            {/* input: Densité au m. */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Densité (cps/m)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="Shots per meter"
                className="w-full h-8 px-2 text-xs font-mono bg-white border border-slate-200 rounded focus:outline-none focus:border-[#f97316]"
                value={newPerf.density !== undefined && newPerf.density !== null ? newPerf.density : ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  const top = newPerf.topDepth || 0;
                  const bottom = newPerf.bottomDepth || 0;
                  const fields = calculatePerforationFields(top, bottom, newPerf.height, val, undefined);
                  setNewPerf(prev => ({
                    ...prev,
                    density: val,
                    shots: fields.shots
                  }));
                }}
              />
            </div>

            {/* input: Calage */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Calage
              </label>
              <input
                type="text"
                placeholder="e.g. CCL"
                className="w-full h-8 px-2 text-xs font-mono bg-white border border-slate-200 rounded focus:outline-none focus:border-[#f97316]"
                value={newPerf.calage || ''}
                onChange={(e) => setNewPerf(prev => ({ ...prev, calage: e.target.value }))}
              />
            </div>

            {/* input: Nbr. de Cps. Tirés */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Nbr. de Cps. Tirés
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="Total shots"
                className="w-full h-8 px-2 text-xs font-mono font-bold text-rose-600 bg-white border border-slate-200 rounded focus:outline-none focus:border-[#f97316]"
                value={newPerf.shots !== undefined && newPerf.shots !== null ? newPerf.shots : ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  setNewPerf(prev => ({ ...prev, shots: val }));
                }}
              />
            </div>

            {/* Save Button */}
            <div className="flex items-end lg:col-span-3">
              <button
                type="button"
                onClick={handleSavePerf}
                className="w-full sm:w-auto px-6 h-8 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                {editingPerfId ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {editingPerfId ? "Update Perforation Zone" : "Add Perforation Zone"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE PERFORATION LEVELS TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs shrink-0">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Perforation Intervals & Guns Tally</h4>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            {well.perforations.length} Active Zones
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/60 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2">De (m)</th>
                <th className="px-4 py-2">À (m)</th>
                <th className="px-2 py-2 text-center">Réservoir</th>
                <th className="px-2 py-2 text-center">Hauteur (m)</th>
                <th className="px-2 py-2 text-center">Type de Perfo.</th>
                <th className="px-2 py-2 text-center">Diamètre</th>
                <th className="px-2 py-2 text-center">Densité</th>
                <th className="px-2 py-2 text-center">Calage</th>
                <th className="px-2 py-2 text-right">Nbr. de Cps.</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {well.perforations.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-xs text-slate-400 italic bg-white">
                    No active perforation levels defined.
                  </td>
                </tr>
              ) : (
                well.perforations.map((perf) => (
                  <tr key={perf.id} className="hover:bg-slate-50/50 bg-white">
                    <td className="px-4 py-3.5 font-bold text-slate-800">{perf.topDepth.toFixed(2)}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-800">{perf.bottomDepth.toFixed(2)}</td>
                    <td className="px-2 py-3.5 text-center">
                      <span className="px-2 py-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded">
                        {perf.reservoir || well.reservoir || '—'}
                      </span>
                    </td>
                    <td className="px-2 py-3.5 text-center font-mono font-bold text-slate-800">{perf.height % 1 === 0 ? perf.height : parseFloat(perf.height.toFixed(2))}m</td>
                    <td className="px-2 py-3.5 text-center text-slate-700 uppercase font-bold">{perf.perfoType || ''}</td>
                    <td className="px-2 py-3.5 text-center font-mono text-slate-600">{perf.diameter || ''}</td>
                    <td className="px-2 py-3.5 text-center font-mono text-slate-600">{perf.density !== undefined ? perf.density : ''}</td>
                    <td className="px-2 py-3.5 text-center font-mono text-slate-600">{perf.calage || ''}</td>
                    <td className="px-2 py-3.5 text-right font-mono font-bold text-rose-600">
                      {perf.shots !== undefined && perf.shots !== null ? (perf.shots % 1 === 0 ? perf.shots : parseFloat(perf.shots.toFixed(2))) : ''}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex justify-end gap-2.5">
                        {canAddOrEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPerfId(perf.id);
                              setNewPerf(perf);
                            }}
                            className="text-sky-500 hover:text-sky-600 transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => removePerforation(perf.id)}
                            className="text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
