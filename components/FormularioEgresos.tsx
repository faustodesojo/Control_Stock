
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Material, MovementItem } from '../types';
import { ArrowDownTrayIcon, PlusIcon, TrashIcon } from '../constants';
import { processStockOutcome, getMaterials } from '../firebaseService'; // Import Firestore functions

interface OutcomeFormProps {
 // No props needed as materials will be fetched internally
}
 
const FormularioEgresos: React.FC<OutcomeFormProps> = () => { 
  const navigate = useNavigate();
  const [outcomeItems, setOutcomeItems] = useState<MovementItem[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [outcomeDate, setOutcomeDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [materials, setMaterials] = useState<Material[]>([]); // State for materials
  const [loading, setLoading] = useState<boolean>(true); // State for initial material loading
  const [budgetTarget, setBudgetTarget] = useState<string>('');

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const materialsData = await getMaterials();
        setMaterials(materialsData);
      } catch (error) {
        console.error('Error fetching materials:', error);
        // Handle error appropriately (e.g., show error message)
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, []); // Empty dependency array means this runs once on mount

  const [submitting, setSubmitting] = useState<boolean>(false); // Add submitting state
  const availableMaterialsForSelection = useMemo(() => {
    return materials
      .map(m => ({
        ...m,
        availableForOutcome: m.stock - m.reserved,
      }))
      .filter(m => !outcomeItems.some(item => item.materialId === m.id)); // Exclude already added
  }, [materials, outcomeItems]);

  const handleAddMaterialToList = () => {
    if (!selectedMaterialId) {
      alert("Por favor, seleccione un material.");
      return;
    }
    
    const material = materials.find(m => m.id === selectedMaterialId);
    if (!material) {
      alert("Material seleccionado no encontrado.");
      return;
    }
    
    const availableForOutcome = material.stock - material.reserved;
    if (quantity <= 0) {
      alert("La cantidad a egresar debe ser mayor que cero.");
      return;
    }
    if (quantity > availableForOutcome) {
      alert(`No se puede agregar ${quantity} ${material.unit}(s) de ${material.name} a la lista. 
             Máximo disponible para egreso (sin afectar reservas): ${availableForOutcome} ${material.unit}(s).`);
      return;
    }
     if (outcomeItems.find(item => item.materialId === selectedMaterialId)) { // Should be prevented by availableMaterialsForSelection
        alert(`El material "${material.name}" ya fue agregado a la lista de egresos.`);
        return;
    }

    setOutcomeItems(prev => [...prev, { 
      materialId: material.id, 
      materialName: material.name,
      materialUnit: material.unit,
      quantity 
    }]);
    setSelectedMaterialId('');
    setQuantity(1);
  };

  const handleRemoveMaterialFromList = (materialId: string) => {
    setOutcomeItems(prev => prev.filter(item => item.materialId !== materialId));
  };

  const handleSubmit = async (e: React.FormEvent) => { // Make handleSubmit async
    e.preventDefault();

    if (outcomeItems.length === 0) {
      alert("Por favor, agregue al menos un material a la lista de egresos.");
      return;
    }
    if (!outcomeDate) {
      alert("Por favor, seleccione una fecha de egreso.");
      return;
    }
    // Final validation before submitting (should be redundant if add logic is correct, but good safeguard)
    for (const item of outcomeItems) {
        const material = materials.find(m => m.id === item.materialId);
        if (!material || item.quantity > (material.stock - material.reserved)) {
            alert(`Error de validación para ${item.materialName}. Cantidad excede disponible. Por favor, revise la lista.`);
            return;
        }
    }

    setSubmitting(true); // Start submitting state

    try {
      await processStockOutcome(outcomeItems, outcomeDate, budgetTarget); // Call Firestore function
      let alertMessage = `Egreso de ${outcomeItems.length} tipo(s) de material(es) registrado exitosamente para la fecha ${new Date(outcomeDate).toLocaleDateString()}.`;
      if (budgetTarget) {
          alertMessage += ` Asociado al presupuesto/referencia: ${budgetTarget}.`;
      }
      alert(alertMessage);

      // Reset form state after successful submission
      setOutcomeItems([]);
      setSelectedMaterialId('');
      setQuantity(1);
      setOutcomeDate(new Date().toISOString().split('T')[0]);
      setBudgetTarget('');
    }
     finally {
      setSubmitting(false); // End submitting state
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Registrar Egreso de Materiales</h1>
      
      <div className="space-y-4 border-b border-gray-200 pb-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700">Agregar Material al Egreso</h2>
         {loading ? (
           <p className="text-center text-gray-500">Cargando materiales...</p>
         ) : materials.length === 0 ? (
           <p className="text-center text-gray-500">No hay materiales registrados para egresar.</p>
         ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <label htmlFor="material" className="block text-sm font-medium text-gray-700">Material</label>
            <select
              id="material"
              value={selectedMaterialId}
              onChange={(e) => setSelectedMaterialId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="">Seleccione un material...</option>
              {availableMaterialsForSelection.map(m => (
                <option key={m.id} value={m.id} disabled={m.availableForOutcome <= 0}>
                  {m.name} (Disp. p/ Egreso: {m.availableForOutcome} {m.unit})
                </option>
              ))}
               {materials.filter(m => (m.stock - m.reserved) <= 0 && !outcomeItems.some(oi => oi.materialId === m.id)).length > 0 &&
                availableMaterialsForSelection.filter(am => am.availableForOutcome > 0).length === 0 && (
                  <option value="" disabled>No hay más materiales con stock disponible para egreso</option>
              )}
            </select>
          </div>
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Cantidad</label>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              min="1"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
        </div>
         )}
        <button
          type="button"
          onClick={handleAddMaterialToList}
          className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex items-center"
        >
          <PlusIcon className="w-5 h-5 mr-2" /> Agregar a la Lista
        </button>
      </div>

      {outcomeItems.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Materiales a Egresar:</h3>
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
            {outcomeItems.map(item => (
              <li key={item.materialId} className="px-4 py-3 flex justify-between items-center">
                <div>
                  <span className="font-medium text-gray-800">{item.materialName}</span>
                  <span className="text-sm text-gray-500 ml-2">({item.quantity} {item.materialUnit})</span>
                </div>
                <button
                  onClick={() => handleRemoveMaterialFromList(item.materialId)}
                  className="text-red-500 hover:text-red-700"
                  aria-label={`Quitar ${item.materialName} de la lista`}
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
            <label htmlFor="budgetTarget" className="block text-sm font-medium text-gray-700">
                Número de Presupuesto/Referencia (Opcional)
            </label>
            <input
                type="text"
                id="budgetTarget"
                value={budgetTarget}
                onChange={(e) => setBudgetTarget(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Ej: P-12345, REF-002, Daño, Merma"
            />
        </div>
        <div>
            <label htmlFor="outcomeDate" className="block text-sm font-medium text-gray-700">
                Fecha de Egreso General
            </label>
            <input
                type="date"
                id="outcomeDate"
                value={outcomeDate}
                onChange={(e) => setOutcomeDate(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
        </div>
       
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={outcomeItems.length === 0 || submitting} // Disable when no items or submitting
            className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownTrayIcon className="w-5 h-5 mr-2" /> Registrar Egreso Total
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormularioEgresos;