import React from 'react';
import { Settings, Ruler, Building, Tag, FileText, MapPin } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import { WellData } from '../types';

interface WellMetadataFormProps {
  well: WellData;
  onChange: (updatedWell: WellData) => void;
}

export default function WellMetadataForm({ well, onChange }: WellMetadataFormProps) {
  const handleChange = (field: keyof WellData, value: any) => {
    onChange({
      ...well,
      [field]: value,
      updatedAt: new Date().toISOString()
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-6 w-full" id="metadata_form_container">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-50 shrink-0" id="metadata_form_header">
        <div>
          <h3 className="font-sans font-semibold text-slate-800 text-sm">Well Identification & Parameters</h3>
          <p className="text-xs text-slate-400">Specify general metadata, locations, and elevations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="metadata_fields_grid">
        {/* Folio N° */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="well_folio">Folio N°</label>
          <input
            type="text"
            id="well_folio"
            className="w-full px-3 py-1 h-7 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium bg-slate-100 text-slate-500 cursor-not-allowed"
            value={well.folio || '00'}
            disabled
            placeholder="e.g. 02"
            title="Auto-incremented on save to database"
          />
        </div>
        
        {/* Well Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="well_name">Well Name (GARA 2)</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Tag className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              id="well_name"
              className="w-full pl-9 pr-3 py-1 h-7 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              value={well.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. GARA 2"
            />
          </div>
        </div>

        {/* Périmètre */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="well_field">Périmètre</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <MapPin className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              id="well_field"
              className="w-full pl-9 pr-3 py-1 h-7 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              value={well.field || ''}
              onChange={(e) => handleChange('field', e.target.value)}
              placeholder="e.g. Tiguentourine"
            />
          </div>
        </div>

        {/* Reservoir */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="well_reservoir">Reservoir</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Building className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              id="well_reservoir"
              className="w-full pl-9 pr-3 py-1 h-7 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              value={well.reservoir}
              onChange={(e) => handleChange('reservoir', e.target.value)}
              placeholder="e.g. F6"
            />
          </div>
        </div>

        {/* Completion Type */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="well_completion">Completion Type</label>
          <input
            type="text"
            id="well_completion"
            className="w-full px-3 py-1 h-7 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            value={well.completionType}
            onChange={(e) => handleChange('completionType', e.target.value)}
            placeholder="e.g. COMPLETION SIMPLE"
          />
        </div>

        {/* Purpose */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Well Purpose (Puits Type)</label>
          <div className="flex gap-4 px-1 py-1">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="well_purpose"
                value="PPH"
                checked={well.purpose === 'PPH' || well.purpose === 'Puits Producteur Huile (PPH)'}
                onChange={() => handleChange('purpose', 'PPH')}
                className="w-4 h-4 text-sky-500 border-slate-300 focus:ring-sky-500"
              />
              PPH
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="well_purpose"
                value="PPG"
                checked={well.purpose === 'PPG'}
                onChange={() => handleChange('purpose', 'PPG')}
                className="w-4 h-4 text-sky-500 border-slate-300 focus:ring-sky-500"
              />
              PPG
            </label>
          </div>
        </div>

        {/* Spool / Rig Details */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="well_spool">Sp.att tbg</label>
          <input
            type="text"
            id="well_spool"
            className="w-full px-3 py-1 h-7 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            value={well.spoolProd || ''}
            onChange={(e) => handleChange('spoolProd', e.target.value)}
            placeholder="e.g. + 0.68"
          />
        </div>

        {/* PKR de tête */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="well_packer_type">PKR de tête (Etan. s/ tbg)</label>
          <input
            type="text"
            id="well_packer_type"
            className="w-full px-3 py-1 h-7 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            value={well.packerType || ''}
            onChange={(e) => handleChange('packerType', e.target.value)}
            placeholder="e.g. //"
          />
        </div>

        {/* ETAN. S/ TBG. */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="well_etan_tbg">ETAN. S/ TBG.</label>
          <input
            type="text"
            id="well_etan_tbg"
            className="w-full px-3 py-1 h-7 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            value={well.etanTbg || ''}
            onChange={(e) => handleChange('etanTbg', e.target.value)}
            placeholder="e.g. ETAN. S/ TBG."
          />
        </div>
      </div>

      {/* TETE D'ERUPTION / CHRISTMAS TREE DETAILS */}
      <div className="bg-slate-50/50 rounded-lg border border-slate-100 p-3.5 space-y-3" id="tete_deruption_container">
        <span className="text-xs font-bold text-slate-700 block">
          Tête d'Éruption (Christmas Tree Specifications)
        </span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5" htmlFor="well_x_marque">Marque</label>
            <input
              type="text"
              id="well_x_marque"
              className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium bg-white"
              value={well.xmasTreeBrand || ''}
              onChange={(e) => handleChange('xmasTreeBrand', e.target.value)}
              placeholder="e.g. CROWN"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5" htmlFor="well_x_type">Type</label>
            <input
              type="text"
              id="well_x_type"
              className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium bg-white"
              value={well.xmasTreeType || ''}
              onChange={(e) => handleChange('xmasTreeType', e.target.value)}
              placeholder="e.g. CTCM"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5" htmlFor="well_x_ract">Ract. Sup.</label>
            <input
              type="text"
              id="well_x_ract"
              className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium bg-white"
              value={well.xmasTreeRactSup || ''}
              onChange={(e) => handleChange('xmasTreeRactSup', e.target.value)}
              placeholder="e.g. CB 15A"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5" htmlFor="well_x_pression">Pression service</label>
            <input
              type="text"
              id="well_x_pression"
              className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium bg-white"
              value={well.xmasTreePressure || ''}
              onChange={(e) => handleChange('xmasTreePressure', e.target.value)}
              placeholder="e.g. 2000"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5" htmlFor="well_x_attache">Attache Tbg</label>
            <input
              type="text"
              id="well_x_attache"
              className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium bg-white"
              value={well.xmasTreeAttacheTbg || ''}
              onChange={(e) => handleChange('xmasTreeAttacheTbg', e.target.value)}
              placeholder="e.g. OLIVE"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5" htmlFor="well_x_embase">Embase</label>
            <input
              type="text"
              id="well_x_embase"
              className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium bg-white"
              value={well.xmasTreeEmbase || ''}
              onChange={(e) => handleChange('xmasTreeEmbase', e.target.value)}
              placeholder='e.g. 11" 2000'
            />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5" htmlFor="well_x_reduction">Réduction</label>
            <input
              type="text"
              id="well_x_reduction"
              className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium bg-white"
              value={well.xmasTreeReduction || ''}
              onChange={(e) => handleChange('xmasTreeReduction', e.target.value)}
              placeholder='e.g. 7"1/16 X 2"9/16. 2000'
            />
          </div>
          <div className="col-span-4">
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5" htmlFor="well_x_olive">SUSP. TBG - Olive</label>
            <input
              type="text"
              id="well_x_olive"
              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium bg-white"
              value={well.xmasTreeOlive || ''}
              onChange={(e) => handleChange('xmasTreeOlive', e.target.value)}
              placeholder='e.g. CAM A403 Taraudée en 2" 7/8 EU'
            />
          </div>
        </div>
      </div>

      {/* VANNES / VALVES FORM SECTION */}
      <div className="bg-slate-50/50 rounded-lg border border-slate-100 p-3.5 space-y-3" id="vannes_specification_container">
        <span className="text-xs font-bold text-slate-700 block">
          Vannes de Tête d'Éruption (Valves Specifications)
        </span>
        <div className="space-y-2.5">
          {/* SAS */}
          <div className="grid grid-cols-4 gap-2 items-center">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">SAS</span>
            <input
              type="text"
              className="col-span-1 px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Marque"
              value={well.vannesSasMarque || ''}
              onChange={(e) => handleChange('vannesSasMarque', e.target.value)}
              title="SAS Marque"
            />
            <input
              type="text"
              className="col-span-1 px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Nombre"
              value={well.vannesSasNombre || ''}
              onChange={(e) => handleChange('vannesSasNombre', e.target.value)}
              title="SAS Nombre"
            />
            <input
              type="text"
              className="col-span-1 px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Ø et Série"
              value={well.vannesSasSerie || ''}
              onChange={(e) => handleChange('vannesSasSerie', e.target.value)}
              title="SAS Ø et Série"
            />
          </div>
          {/* Maîtresse */}
          <div className="grid grid-cols-4 gap-2 items-center">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Maitresse</span>
            <input
              type="text"
              className="col-span-1 px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Marque"
              value={well.vannesMaitresseMarque || ''}
              onChange={(e) => handleChange('vannesMaitresseMarque', e.target.value)}
              title="Maitresse Marque"
            />
            <input
              type="text"
              className="col-span-1 px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Nombre"
              value={well.vannesMaitresseNombre || ''}
              onChange={(e) => handleChange('vannesMaitresseNombre', e.target.value)}
              title="Maitresse Nombre"
            />
            <input
              type="text"
              className="col-span-1 px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Ø et Série"
              value={well.vannesMaitresseSerie || ''}
              onChange={(e) => handleChange('vannesMaitresseSerie', e.target.value)}
              title="Maitresse Ø et Série"
            />
          </div>
          {/* LAT-TBG */}
          <div className="grid grid-cols-4 gap-2 items-center">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">LAT-TBG</span>
            <input
              type="text"
              className="col-span-1 px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Marque"
              value={well.vannesLatTbgMarque || ''}
              onChange={(e) => handleChange('vannesLatTbgMarque', e.target.value)}
              title="LAT-TBG Marque"
            />
            <input
              type="text"
              className="col-span-1 px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Nombre"
              value={well.vannesLatTbgNombre || ''}
              onChange={(e) => handleChange('vannesLatTbgNombre', e.target.value)}
              title="LAT-TBG Nombre"
            />
            <input
              type="text"
              className="col-span-1 px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Ø et Série"
              value={well.vannesLatTbgSerie || ''}
              onChange={(e) => handleChange('vannesLatTbgSerie', e.target.value)}
              title="LAT-TBG Ø et Série"
            />
          </div>
          {/* LAT-CSG */}
          <div className="grid grid-cols-4 gap-2 items-center">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">LAT-CSG.</span>
            <input
              type="text"
              className="col-span-1 px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Marque"
              value={well.vannesLatCsgMarque || ''}
              onChange={(e) => handleChange('vannesLatCsgMarque', e.target.value)}
              title="LAT-CSG Marque"
            />
            <input
              type="text"
              className="col-span-1 px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Nombre"
              value={well.vannesLatCsgNombre || ''}
              onChange={(e) => handleChange('vannesLatCsgNombre', e.target.value)}
              title="LAT-CSG Nombre"
            />
            <input
              type="text"
              className="col-span-1 px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Ø et Série"
              value={well.vannesLatCsgSerie || ''}
              onChange={(e) => handleChange('vannesLatCsgSerie', e.target.value)}
              title="LAT-CSG Ø et Série"
            />
          </div>
        </div>
      </div>

      {/* ELEVATIONS AND REFERENCE POINTS */}
      <div className="bg-slate-50/50 rounded-lg border border-slate-100 p-3.5 space-y-3" id="elevations_container">
        <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
          Elevations & Depth Origins (m)
        </span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5" htmlFor="elev_sol">Z Sol (GL)</label>
            <input
              type="number"
              step="0.01"
              id="elev_sol"
              className="w-full px-2 py-1.5 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              value={well.elevationSol}
              onChange={(e) => handleChange('elevationSol', parseFloat(e.target.value) || 0)}
              placeholder="e.g. 523.52"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5" htmlFor="elev_forage">Z Forage (KB)</label>
            <input
              type="number"
              step="0.01"
              id="elev_forage"
              className="w-full px-2 py-1.5 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              value={well.elevationForage}
              onChange={(e) => handleChange('elevationForage', parseFloat(e.target.value) || 0)}
              placeholder="e.g. 527.08"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5" htmlFor="elev_prod">Z Production</label>
            <input
              type="number"
              step="0.01"
              id="elev_prod"
              className="w-full px-2 py-1.5 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              value={well.elevationProduction}
              onChange={(e) => handleChange('elevationProduction', parseFloat(e.target.value) || 0)}
              placeholder="e.g. 522.82"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5" htmlFor="origine_cotes">Origine cotes</label>
            <input
              type="text"
              id="origine_cotes"
              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-medium"
              value={well.origineCotes || ''}
              onChange={(e) => handleChange('origineCotes', e.target.value)}
              placeholder="e.g. KB"
            />
          </div>
        </div>
      </div>

      {/* GENERAL OBSERVATIONS */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="well_obs">General Notes / Observations</label>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <RichTextEditor 
            value={well.observations || ''}
            onChange={(value) => handleChange('observations', value)}
          />
        </div>
      </div>

      {/* Signatures & Revisions Block */}
      <div className="pt-2 mt-2 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wide">Official Validations</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Annule le folio N°</label>
            <input
              type="text"
              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium bg-slate-100 text-slate-500 cursor-not-allowed"
              value={well.folioToCancel || '00'}
              disabled
              placeholder="e.g. 01"
              title="Automatically tracks previous folio on update"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Mis à jour le</label>
            <input
              type="date"
              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium bg-slate-50"
              value={well.updatedDate || ''}
              onChange={(e) => handleChange('updatedDate', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Fin opération le</label>
            <input
              type="date"
              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium bg-slate-50"
              value={well.endOperationDate || ''}
              onChange={(e) => handleChange('endOperationDate', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Vu par</label>
            <input
              type="text"
              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium bg-slate-50 uppercase"
              value={well.vuBy || ''}
              onChange={(e) => handleChange('vuBy', e.target.value)}
              placeholder="Nom"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
