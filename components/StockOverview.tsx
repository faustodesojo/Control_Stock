import React, { useState, useMemo } from 'react';
import { Material, StockSummary } from '../types';
import { PlusIcon, TrashIcon } from '../constants';

interface NewMaterialFormState {
  name: string;
  unit: string;
  category: string;
  stock: number;
}

interface StockOverviewProps extends React.PropsWithChildren {
  materials: Material[];
  summary: StockSummary;
  addMaterial: (newMaterialData: Omit<Material, 'id' | 'reserved'>) => void;
  removeMaterial: (materialId: string) => void;
}

const StockOverview: React.FC<StockOverviewProps> = ({ materials, summary, addMaterial, removeMaterial }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState<NewMaterialFormState>({
    name: '',
    unit: '',
    category: '',
    stock: 0,
  });

  const sortedMaterials = useMemo(() => {
    const materialsArray = Array.isArray(materials) ? materials : [];
    return [...materialsArray].sort((a, b) => {
      const catA = a.category || 'Sin Categoría';
      const catB = b.category || 'Sin Categoría';
      if (catA.toLowerCase() < catB.toLowerCase()) return -1;
      if (catA.toLowerCase() > catB.toLowerCase()) return 1;
      if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
      if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
      return 0;
    });
  }, [materials]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewMaterial((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterial.name || !newMaterial.unit || !newMaterial.category) {
      alert("Por favor, complete todos los campos para el nuevo material (Nombre, Unidad, Categoría).");
      return;
    }
    try {
      await addMaterial({ ...newMaterial, reserved: 0 });
      alert("Material agregado exitosamente!");
      setIsModalOpen(false);
      setNewMaterial({ name: '', unit: '', category: '', stock: 0 });
    } catch (error) {
      console.error("Error adding material:", error);
      alert("Error al agregar material. Intente de nuevo.");
    }
  };

  const handleRemoveMaterial = async (materialId: string, materialName: string, currentStock: number) => {
    const material = materials.find(m => m.id === materialId);
    if (!material) {
      alert(`Error: No se encontró el material "${materialName}" para eliminar.`);
      return;
    }
    if (material.reserved > 0) {
      alert(`El material "${materialName}" no puede ser eliminado porque tiene cantidades reservadas para proyectos pendientes.`);
      return;
    }
    let confirmationMessage = `¿Está seguro de que desea eliminar el material "${materialName}"?`;
    if (currentStock > 0) {
      confirmationMessage = `El material "${materialName}" tiene ${currentStock} ${material.unit}(s) en stock. ${confirmationMessage} Esta acción es irreversible.`;
    }
    if (window.confirm(confirmationMessage)) {
      try {
        removeMaterial(materialId);
        alert("Material eliminado exitosamente!");
      } catch (error) {
        console.error("Error removing material:", error);
        alert("Error al eliminar material. Intente de nuevo.");
      }
    }
  };

  let lastCategoryRendered = "";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Visión General del Stock</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center"
        >
          <PlusIcon className="w-5 h-5 mr-2" /> Agregar Nuevo Material
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700">Stock Total (Unidades/Items)</h2>
          <p className="text-3xl font-bold text-primary-600">{summary.totalStockValue}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700">Disponible para Proyectos</h2>
          <p className="text-3xl font-bold text-green-600">{summary.totalAvailable}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700">Reservado para Trabajos</h2>
          <p className="text-3xl font-bold text-yellow-600">{summary.totalReserved}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Detalle de Materiales</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">En Stock</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Reservado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Disponible</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedMaterials.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-4">No hay materiales registrados. Agregue uno para comenzar.</td>
                </tr>
              )}
              {sortedMaterials.map((material) => {
                const currentCategory = material.category || 'Sin Categoría';
                const showCategoryHeader = currentCategory !== lastCategoryRendered;
                if (showCategoryHeader) {
                  lastCategoryRendered = currentCategory;
                }
                return (
                  <React.Fragment key={material.id}>
                    {showCategoryHeader && (
                      <tr className="bg-primary-50">
                        <td colSpan={6} className="px-6 py-3 text-left text-md font-semibold text-primary-700">
                          {lastCategoryRendered}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{material.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{material.unit}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 text-right">{material.stock}</td>
                      <td className="px-6 py-4 text-sm text-yellow-600 text-right">{material.reserved}</td>
                      <td className="px-6 py-4 text-sm text-green-600 text-right">{material.stock - material.reserved}</td>
                      <td className="px-6 py-4 text-sm text-center">
                        <button
                          onClick={() => handleRemoveMaterial(material.id, material.name, material.stock)}
                          disabled={material.reserved > 0}
                          className="text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed p-1"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Agregar Nuevo Material</h2>
            <form onSubmit={handleAddMaterialSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre del Material</label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={newMaterial.name}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label htmlFor="unit" className="block text-sm font-medium text-gray-700">Unidad</label>
                <input
                  type="text"
                  name="unit"
                  id="unit"
                  value={newMaterial.unit}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoría</label>
                <input
                  type="text"
                  name="category"
                  id="category"
                  value={newMaterial.category}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockOverview;
