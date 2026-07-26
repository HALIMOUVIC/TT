import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, PenLine, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { updateTubingComponentMatrix } from '../lib/wellboreEngine';

export interface CustomTool {
  id?: string;
  type: string;
  default_name: string;
  default_od: string;
  default_custom_type: string;
  default_min_id: string;
  french_designation: string;
}

interface CustomToolsModalProps {
  onUpdated?: () => void;
  canAddOrEdit?: boolean;
  canDelete?: boolean;
}

function SortableToolRow({
  tool,
  index,
  total,
  isEditing,
  editForm,
  canAddOrEdit,
  canDelete,
  onStartEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  setEditForm,
  onSave,
  onCancel
}: {
  tool: CustomTool;
  index: number;
  total: number;
  isEditing: boolean;
  editForm: Partial<CustomTool>;
  canAddOrEdit: boolean;
  canDelete: boolean;
  onStartEdit: (tool: CustomTool) => void;
  onDelete: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  setEditForm: (form: Partial<CustomTool>) => void;
  onSave: (form: Partial<CustomTool>) => void;
  onCancel: () => void;
}) {
  const toolId = tool.id || `tool-${index}`;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: toolId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  if (isEditing) {
    return (
      <tr ref={setNodeRef} style={style} className="bg-blue-50/30">
        <td className="px-4 py-3" colSpan={5}>
          <EditForm form={editForm} onChange={setEditForm} onCancel={onCancel} onSave={() => onSave(editForm)} />
        </td>
      </tr>
    );
  }

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-slate-50/50 group transition-colors bg-white">
      <td
        className="w-10 px-3 py-3 cursor-grab text-slate-400 hover:text-slate-600 active:cursor-grabbing text-center"
        {...attributes}
        {...listeners}
        title="Glisser-déposer pour réorganiser à la souris"
      >
        <GripVertical className="w-4 h-4 mx-auto" />
      </td>
      <td className="px-4 py-3 font-medium text-slate-800">{tool.french_designation || tool.type}</td>
      <td className="px-4 py-3">{tool.default_od || "-"}</td>
      <td className="px-4 py-3">{tool.default_custom_type || "-"}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {canAddOrEdit && (
            <>
              <button
                type="button"
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
                className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded disabled:opacity-30 disabled:hover:bg-transparent transition"
                title="Déplacer vers le haut"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onMoveDown(index)}
                disabled={index === total - 1}
                className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded disabled:opacity-30 disabled:hover:bg-transparent transition"
                title="Déplacer vers le bas"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button onClick={() => onStartEdit(tool)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded" title="Modifier">
                <PenLine className="w-4 h-4" />
              </button>
            </>
          )}
          {canDelete && (
            <button onClick={() => onDelete(tool.id!)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Supprimer">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function CustomToolsModal({ onUpdated, canAddOrEdit = true, canDelete = true }: CustomToolsModalProps) {
  const [tools, setTools] = useState<CustomTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CustomTool>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchTools = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/supabase/custom-tool-types');
      const data = await res.json();
      if (data.success) {
        setTools(data.data);
        updateTubingComponentMatrix(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setTools((items) => {
        const oldIndex = items.findIndex((item, idx) => (item.id || `tool-${idx}`) === active.id);
        const newIndex = items.findIndex((item, idx) => (item.id || `tool-${idx}`) === over.id);
        if (oldIndex < 0 || newIndex < 0) return items;
        const reordered = arrayMove(items, oldIndex, newIndex);
        updateTubingComponentMatrix(reordered);
        if (onUpdated) onUpdated();
        return reordered;
      });
    }
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setTools((items) => {
      const reordered = arrayMove(items, index, index - 1);
      updateTubingComponentMatrix(reordered);
      if (onUpdated) onUpdated();
      return reordered;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= tools.length - 1) return;
    setTools((items) => {
      const reordered = arrayMove(items, index, index + 1);
      updateTubingComponentMatrix(reordered);
      if (onUpdated) onUpdated();
      return reordered;
    });
  };

  const handleSave = async (tool: Partial<CustomTool>) => {
    if (!tool.french_designation) {
      alert("Le champ Désignation est obligatoire.");
      return;
    }
    
    // Ensure all three designation fields are aligned
    const updatedTool = {
      ...tool,
      type: tool.french_designation,
      default_name: tool.french_designation
    };
    
    try {
      const isNew = !tool.id;
      const url = isNew ? '/api/supabase/custom-tool-types' : `/api/supabase/custom-tool-types/${tool.id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTool)
      });
      
      if (res.ok) {
        await fetchTools();
        setEditingId(null);
        setEditForm({});
        if (onUpdated) onUpdated();
      } else {
        const err = await res.json();
        alert(err.error || "Erreur lors de la sauvegarde.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau lors de la sauvegarde.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette désignation ?")) return;
    try {
      const res = await fetch(`/api/supabase/custom-tool-types/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchTools();
        if (onUpdated) onUpdated();
      } else {
        const err = await res.json();
        alert(err.error || "Erreur lors de la suppression.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (tool: CustomTool) => {
    setEditingId(tool.id || null);
    setEditForm({ ...tool });
  };

  const addNew = () => {
    const newId = 'new-' + Date.now();
    setEditingId(newId);
    setEditForm({
      id: undefined,
      type: '',
      default_name: '',
      default_od: "2''7/8",
      default_custom_type: 'EU',
      default_min_id: '',
      french_designation: '',
    });
  };

  const itemIds = tools.map((t, idx) => t.id || `tool-${idx}`);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 w-full flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Catalogue des Composants</h2>
            <p className="text-xs text-slate-500">Ajoutez, modifiez, supprimez ou réorganisez à la souris les types de composants tubings.</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-white">
          
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700">Liste des désignations</h3>
            {canAddOrEdit && (
              <button
                onClick={addNew}
                disabled={editingId !== null}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded hover:bg-orange-600 transition disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Ajouter une désignation
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="w-10 px-3 py-3 text-center">Ordre</th>
                    <th className="px-4 py-3">Désignation</th>
                    <th className="px-4 py-3">OD par défaut</th>
                    <th className="px-4 py-3">Connexion par défaut</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                  <tbody className="divide-y divide-slate-100">
                    {editingId && editForm.id === undefined && (
                      <tr className="bg-orange-50/50">
                        <td className="px-4 py-3" colSpan={5}>
                          <EditForm form={editForm} onChange={setEditForm} onCancel={() => setEditingId(null)} onSave={() => handleSave(editForm)} isNew />
                        </td>
                      </tr>
                    )}
                    
                    {loading && tools.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Chargement...</td></tr>
                    ) : tools.map((tool, index) => (
                      <SortableToolRow
                        key={tool.id || `tool-${index}`}
                        tool={tool}
                        index={index}
                        total={tools.length}
                        isEditing={editingId === tool.id}
                        editForm={editForm}
                        canAddOrEdit={canAddOrEdit}
                        canDelete={canDelete}
                        onStartEdit={startEdit}
                        onDelete={handleDelete}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        setEditForm={setEditForm}
                        onSave={handleSave}
                        onCancel={() => setEditingId(null)}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>
            </DndContext>
          </div>

        </div>
      </div>
    </div>
  );
}

function EditForm({ form, onChange, onCancel, onSave, isNew }: { form: Partial<CustomTool>, onChange: (f: Partial<CustomTool>) => void, onCancel: () => void, onSave: () => void, isNew?: boolean }) {
  const handleDesignationChange = (val: string) => {
    onChange({
      ...form,
      type: val,
      french_designation: val,
      default_name: val
    });
  };

  return (
    <div className="p-3 border border-slate-200 rounded-md bg-white shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Désignation *</label>
          <input
            type="text"
            className="w-full h-8 px-2 text-xs border border-slate-200 rounded"
            value={form.french_designation || ''}
            onChange={e => handleDesignationChange(e.target.value)}
            placeholder="e.g. Anchor-seal"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">OD (Pouces)</label>
            <input
              type="text"
              className="w-full h-8 px-2 text-xs border border-slate-200 rounded"
              value={form.default_od || ''}
              onChange={e => onChange({ ...form, default_od: e.target.value })}
              placeholder="2''7/8"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Connexion par défaut</label>
            <input
              type="text"
              className="w-full h-8 px-2 text-xs border border-slate-200 rounded"
              value={form.default_custom_type || ''}
              onChange={e => onChange({ ...form, default_custom_type: e.target.value })}
              placeholder="EU"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 flex flex-col justify-end">
        <div className="flex justify-end gap-2 pt-4">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition">Annuler</button>
          <button onClick={onSave} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded hover:bg-blue-700 transition">
            <Save className="w-3.5 h-3.5" />
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
