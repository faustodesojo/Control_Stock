
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Material, MovementItem } from '../types';
import { ArrowUpTrayIcon, PlusIcon, TrashIcon } from '../constants';

interface IncomeFormProps {
  materials: Material[];
  onStockIncome: (itemsToIncome: MovementItem[], incomeDate: string) => void;
}

const IncomeForm: React.FC<IncomeFormProps> = ({ materials, onStockIncome }) => {
  const navigate = useNavigate();
  const [incomeItems, setIncomeItems] = useState<MovementItem[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [incomeDate, setIncomeDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const handleAddMaterialToList = () => {
    if (!selectedMaterialId) {
      alert("Por favor, seleccione un material.");
      return;
    }
    if (quantity <= 0) {
      alert("La cantidad a ingresar debe ser mayor que cero.");
      return;
    }
    const material = materials.find(m => m.id === selectedMaterialId);
    if (!material) {
      alert("Material no encontrado.");
      return;
    }
    if (incomeItems.find(item => item.materialId === selectedMaterialId)) {
        alert(`El material "${material.name}" ya fue agregado a la lista de ingresos.`);
        return;
    }

    setIncomeItems(prev => [...prev, { 
      materialId: material.id, 
      materialName: material.name,
      materialUnit: material.unit,
      quantity 
    }]);
    setSelectedMaterialId('');
    setQuantity(1);
  };

  const handleRemoveMaterialFromList = (materialId: string) => {
    setIncomeItems(prev => prev.filter(item => item.materialId !== materialId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (incomeItems.length === 0) {
      alert("Por favor, agregue al menos un material a la lista de ingresos.");
      return;
    }
    if (!incomeDate) {
      alert("Por favor, seleccione una fecha de ingreso.");
      return;
    }
    
    onStockIncome(incomeItems, incomeDate);
    alert(`Ingreso de ${incomeItems.length} tipo(s) de material(es) registrado exitosamente para la fecha ${new Date(incomeDate).toLocaleDateString()}.`);
    setIncomeItems([]);
    setSelectedMaterialId('');
    setQuantity(1);
    setIncomeDate(new Date().toISOString().split('T')[0]);
    // navigate('/'); 
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Registrar Ingreso de Materiales (Múltiple)</h1>
      
      <div className="space-y-4 border-b border-gray-200 pb-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700">Agregar Material al Ingreso</h2>
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
              {materials.map(m => (
                <option key={m.id} value={m.id} disabled={incomeItems.some(item => item.materialId === m.id)}>
                  {m.name} (Stock actual: {m.stock} {m.unit})
                </option>
              ))}
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
         <button
            type="button"
            onClick={handleAddMaterialToList}
            className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex items-center"
          >
            <PlusIcon className="w-5 h-5 mr-2" /> Agregar a la Lista
          </button>
      </div>

      {incomeItems.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Materiales a Ingresar:</h3>
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
            {incomeItems.map(item => (
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
            <label htmlFor="incomeDate" className="block text-sm font-medium text-gray-700">
                Fecha de Ingreso General
            </label>
            <input
                type="date"
                id="incomeDate"
                value={incomeDate}
                onChange={(e) => setIncomeDate(e.target.value)}
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
            disabled={incomeItems.length === 0}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowUpTrayIcon className="w-5 h-5 mr-2" /> Registrar Ingreso Total
          </button>
        </div>
      </form>
    </div>
  );
};

export default IncomeForm;