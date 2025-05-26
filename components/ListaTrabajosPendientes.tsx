import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Project, Material } from '../types';
import { PencilSquareIcon } from '../constants';

interface PendingWorkListProps {
  projects: Project[]; // Restore the prop
  allMaterials: Material[]; // For filter dropdown
}

const ListaTrabajosPendientes: React.FC<PendingWorkListProps> = ({ projects, allMaterials }) => {
  const [filterMaterialId, setFilterMaterialId] = useState<string>('');

  const filteredProjects = useMemo(() => {
    if (!filterMaterialId) {
      return projects;
    }
    return projects.filter(project => project.materials.some(pm => pm.materialId === filterMaterialId));
  }, [projects, filterMaterialId]);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Trabajos Pendientes</h1>
        <div className="w-full sm:w-auto">
          <label htmlFor="materialFilter" className="block text-sm font-medium text-gray-700 sr-only">
            Filtrar por material
          </label>
          <select
            id="materialFilter"
            value={filterMaterialId}
            onChange={(e) => setFilterMaterialId(e.target.value)}
            className="mt-1 block w-full sm:w-64 px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-gray-900"
          >
            <option value="" className="text-gray-900">Todos los Materiales</option>
            {allMaterials.map(material => (
              <option key={material.id} value={material.id} className="text-gray-900">
                {material.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <p className="text-center text-gray-500 py-4">
          {filterMaterialId ? 'Ningún trabajo pendiente contiene el material seleccionado.' : 'No hay trabajos pendientes.'}
        </p>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map(project => (
            <div key={project.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-primary-700">Nº Presupuesto: {project.description}</h2>
                  <p className="text-sm text-gray-600">Cliente: {project.client}</p>
                  <p className="text-sm text-gray-600">Fecha de Inicio: {new Date(project.startDate).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-600">Días Estimados: {project.estimatedDays || 'N/A'}</p>
                  <p className="text-sm text-gray-600">Estado: <span className="font-medium text-yellow-600">{project.status}</span></p>
                </div>
                <Link
                  to={`/trabajo/${project.id}`}
                  className="mt-2 sm:mt-0 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 flex items-center"
                  aria-label={`Ver o ajustar trabajo ${project.description}`}
                >
                  <PencilSquareIcon className="w-4 h-4 mr-2" /> Ver/Ajustar
                </Link>
              </div>
               <div className="mt-3 pt-3 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Materiales Presupuestados:</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {project.materials.map(pm => (
                      <li key={pm.materialId}>{pm.materialName}: {pm.budgetedQuantity} {pm.materialUnit}</li>
                    ))}
                  </ul>
                </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ListaTrabajosPendientes;
