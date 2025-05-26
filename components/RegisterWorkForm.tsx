
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Material, Project, ProjectMaterial, ProjectStatus } from '../types';
import { PlusIcon } from '../constants';

interface RegisterWorkFormProps {
  materials: Material[]; // Prop to provide available materials
}

const RegisterWorkForm: React.FC<RegisterWorkFormProps> = ({ materials, addProject }) => {
  const navigate = useNavigate();
  const [description, setDescription] = useState(''); // Este campo ahora es "Numero de Presupuesto"
  const [client, setClient] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [estimatedDays, setEstimatedDays] = useState<number>(1); // Nuevo estado para días de trabajo
  const [projectMaterials, setProjectMaterials] = useState<ProjectMaterial[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(materials[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(1);

  // Function to add selected material to the project
  const handleAddMaterial = () => {
    if (!selectedMaterialId || quantity <= 0) {
      alert("Por favor, seleccione un material y especifique una cantidad válida.");
      return;
    }
    const material = materials.find(m => m.id === selectedMaterialId);
    if (!material) {
      alert("Material no encontrado.");
      return;
    }
    if (quantity > (material.stock - material.reserved)) {
      alert(`Cantidad solicitada (${quantity}) excede la disponible (${material.stock - material.reserved}) para ${material.name}.`);
      return;
    }
    if (projectMaterials.find(pm => pm.materialId === selectedMaterialId)) {
        alert(`${material.name} ya ha sido agregado a este proyecto.`);
        return;
    }

    setProjectMaterials(prev => [
      ...prev,
      { 
        materialId: material.id, 
        materialName: material.name,
        materialUnit: material.unit,
        budgetedQuantity: quantity, 
        actualQuantity: quantity // Default actual to budgeted initially
      }
    ]);
    setSelectedMaterialId(materials[0]?.id || '');
    setQuantity(1);
  };

  // Function to remove a material from the project
  const handleRemoveMaterial = (materialId: string) => { // Corrected type for materialId
    setProjectMaterials(prev => prev.filter(pm => pm.materialId !== materialId));
  };

  const handleSubmit = async (e: React.FormEvent) => { // Make the function async
    e.preventDefault();
    if (!description || !client || projectMaterials.length === 0 || estimatedDays <= 0) {
      alert("Por favor, complete todos los campos (Numero de Presupuesto, Cliente, Días Estimados) y agregue al menos un material.");
      return;
    }
    const newProject: Project = {
      id: `proj-${Date.now().toString()}-${Math.random().toString(36).substring(2, 7)}`,
      description, // Numero de Presupuesto
      client,
      startDate,
      estimatedDays, // Guardar días estimados
      status: ProjectStatus.PENDIENTE,
      materials: projectMaterials,
    };
    
    // Use the addProject function from firebaseService
    await addProject(newProject);

    // Reset form or navigate
    alert("Trabajo registrado exitosamente!");
    navigate('/trabajos-pendientes');
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Registrar Nuevo Trabajo</h1>
      <form onSubmit={handleSubmit} className="space-y-6"> {/* Added missing onSubmit handler */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Numero de Presupuesto</label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="client" className="block text-sm font-medium text-gray-700">Cliente</label>
          <input
            type="text"
            id="client"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Fecha de Inicio</label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="estimatedDays" className="block text-sm font-medium text-gray-700">Días Estimados de Trabajo</label>
              <input
                type="number"
                id="estimatedDays"
                value={estimatedDays}
                onChange={(e) => setEstimatedDays(Math.max(1, parseInt(e.target.value, 10)))}
                min="1"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
        </div>

        <div className="space-y-4 border-t border-gray-200 pt-6">
          <h2 className="text-xl font-semibold text-gray-700">Materiales Necesarios</h2>
          <div className="flex items-end space-x-2">
            <div className="flex-grow">
              <label htmlFor="material" className="block text-sm font-medium text-gray-700">Material</label>
              <select
                id="material"
                value={selectedMaterialId}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="">Seleccione un material</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id} disabled={m.stock - m.reserved <= 0 || projectMaterials.some(pm => pm.materialId === m.id)}>
                    {m.name} (Disponible: {m.stock - m.reserved} {m.unit})
                  </option>
                ))}
              </select>
            </div>
            <div className="w-1/4">
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Cantidad</label>
              <input
                type="number"
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10)))}
                min="1"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleAddMaterial}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex items-center self-end h-10" /* Adjusted height for alignment */
            >
              <PlusIcon className="w-5 h-5 mr-1" /> Agregar
            </button>
          </div> {/* Added missing closing div tag */}
          {projectMaterials.length > 0 && ( // Check if there are materials before rendering the list
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-medium text-gray-700">Materiales Agregados:</h3>
                <p className="text-sm text-gray-600">Días de trabajo: <span className="font-semibold text-primary-700">{estimatedDays}</span></p>
              </div>
              <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md p-2 bg-gray-50"> {/* Added border, padding and light bg for better visibility */}
                {projectMaterials.map(pm => (
                  <li key={pm.materialId} className="py-2 flex justify-between items-center text-gray-700"> {/* Ensure text color contrasts */} {/* Added missing closing li tag */}
                    <span className="flex-1">{pm.materialName}: {pm.budgetedQuantity} {pm.materialUnit}</span>
                    <button type="button" onClick={() => handleRemoveMaterial(pm.materialId)} className="ml-4 text-red-500 hover:text-red-700 text-sm">Quitar</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mr-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center" // Adjusted class name
          >
            <PlusIcon className="w-5 h-5 mr-2" /> Registrar Trabajo
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegisterWorkForm;