

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Project, ProjectMaterial, Material, ProjectStatus } from '../types';
import { CheckCircleIcon, PlusIcon, TrashIcon } from '../constants';
import { getProjectById, updateProjectInFirestore, completeProjectInFirestore, addMaterialToProjectInFirestore, removeMaterialFromProjectInFirestore } from '../firebaseService';

interface PendingWorkDetailProps {
  materials: Material[]; // All available materials in the system
  refetchProjects: () => Promise<void>; // Added refetchProjects prop
}
const DetalleTrabajoPendiente: React.FC<PendingWorkDetailProps> = ({ materials, refetchProjects }) => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [editedMaterials, setEditedMaterials] = useState<ProjectMaterial[]>([]);

  const [materialToAddId, setMaterialToAddId] = useState<string>('');
  const [materialToAddBudgetedQty, setMaterialToAddBudgetedQty] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => { }, [projectId, navigate]); // Dependencies for fetchProject useEffect
    const fetchProject = async () => {
      if (!projectId) {
        setLoading(false);
        navigate('/trabajos-pendientes', { replace: true });
        return;
      }
      try {
        const foundProject = await getProjectById(projectId);
        if (foundProject) {
          setCurrentProject({ ...foundProject });
          setEditedMaterials(JSON.parse(JSON.stringify(foundProject.materials)));
        } else {
          console.warn(`Project with ID ${projectId} not found in Firestore. Navigating away.`);
          navigate('/trabajos-pendientes', { replace: true });
        }
      } catch (error) {
        console.error('Error fetching project from Firestore:', error);
        // Optionally set an error state and display an error message
        navigate('/trabajos-pendientes', { replace: true }); // Navigate away on error
      } finally {
        setLoading(false);
      }
    };
    fetchProject();

  useEffect(() => {
    console.log("Prop 'materials' actualizada en DetalleTrabajoPendiente:", materials);
  }, [materials]); // Log whenever the materials prop changes


  const handleMaterialQuantityChange = (materialId: string, newActualQuantityStr: string) => {
    const newActualQuantityRaw = parseInt(newActualQuantityStr, 10);
    // Treat empty string or invalid number as 0 for actual quantity
    const newActualQuantity = isNaN(newActualQuantityRaw) ? 0 : Math.max(0, newActualQuantityRaw);

    setEditedMaterials(prev =>
      prev.map(pm =>
        pm.materialId === materialId ? { ...pm, actualQuantity: newActualQuantity } : pm
      )
    );
  };

  const handleSaveChanges = async () => {
    if (!currentProject) {
        console.error("handleSaveChanges: Local project state not loaded.");
      navigate('/trabajos-pendientes', { replace: true });
        return;
    }

    for (const editedMat of editedMaterials) {
        if (typeof editedMat.actualQuantity !== 'number' || editedMat.actualQuantity < 0 || isNaN(editedMat.actualQuantity)) {
            alert(`La cantidad replanteada para "${editedMat.materialName}" debe ser un número igual o mayor a cero.`);
            return;
        }
    }

    // Construct the updated project data from local state
    const updatedProjectData: Project = {
      ...currentProject, 
      materials: editedMaterials, // Use the locally edited materials
    };

    try {
      await updateProjectInFirestore(updatedProjectData.id, { materials: updatedProjectData.materials });
      alert("Cambios en cantidades replanteadas guardados. Estos se usarán al finalizar el trabajo.");
      // Optionally refetch the project or update local state from Firestore data
    } catch (error) {
      console.error("Error saving changes to Firestore:", error);
 alert("Error al guardar cambios en Firestore.");
    }
  };
  const handleCompleteWork = async () => {
    if (!currentProject) {
        console.error("handleCompleteWork: Local project state not loaded.");
        alert("Error: No se pudo finalizar. El proyecto no está cargado.");
        return;
 }
    
    // Validate actual quantities before proceeding
    for (const em of editedMaterials) {
      if (typeof em.actualQuantity !== 'number' || em.actualQuantity < 0 || isNaN(em.actualQuantity)) {
        alert(`Por favor, ingrese una cantidad replanteada válida (número >= 0) para ${em.materialName}.`);
        return;
      }
    }
    
    // Validate stock availability (complex validation, ensure it uses correct values)
    for (const projMat of editedMaterials) {
        const stockMaterial = materials.find(m => m.id === projMat.materialId); // Overall stock item
        const originalBudgetedItem = currentProject.materials.find(pm => pm.materialId === projMat.materialId);
        const originalProjectBudgetedQty = originalBudgetedItem ? originalBudgetedItem.budgetedQuantity : 0;
        
        if (stockMaterial) {
            // Effective available = total stock - (total reserved - what *this* project reserved)
            const reservedByOtherProjects = stockMaterial.reserved - originalProjectBudgetedQty;
            const effectiveAvailableStock = stockMaterial.stock - reservedByOtherProjects;

            if (projMat.actualQuantity > effectiveAvailableStock) {
                alert(`La cantidad replanteada final para ${projMat.materialName} (${projMat.actualQuantity}) excede el stock disponible efectivo (${effectiveAvailableStock}).\nStock total: ${stockMaterial.stock}, Reservado total: ${stockMaterial.reserved} (de los cuales ${originalProjectBudgetedQty} eran para este trabajo).`);
                return;
            }
        } else {
            alert(`Error crítico: No se encontró el material ${projMat.materialName} en el inventario general. Contacte a soporte.`);
            return;
        }
    }

    if (window.confirm("¿Está seguro de que desea marcar este trabajo como finalizado? Esta acción ajustará el stock.")) {
      try {
        await completeProjectInFirestore(currentProject.id, editedMaterials);
        // Assuming completeProjectInFirestore handles stock updates and project status
        alert("Trabajo finalizado con éxito. Stock ajustado.");
        navigate('/trabajos-completados', { replace: true });
      } catch (error) {
        console.error("Error completing work in Firestore:", error);
        alert("Error al finalizar el trabajo en Firestore.");
      }
    }
  }; 

  const handleAddMaterialToProjectBudget = async () => {
 if (!currentProject) {
 console.error("handleAddMaterialToProjectBudget: Local project state not loaded.");
 navigate('/trabajos-pendientes', { replace: true });
 return;
    }
    if (!materialToAddId || materialToAddBudgetedQty <= 0) {
      alert("Seleccione un material y especifique una cantidad presupuestada válida (mayor a 0).");
      return;
    }
    const materialInfo = materials.find(m => m.id === materialToAddId);
    if (!materialInfo) {
 console.error(`Material with ID ${materialToAddId} not found in materials prop.`);
 // Depending on where 'materials' comes from, you might need to fetch it from Firestore here too.
 alert("Error interno: Material seleccionado no encontrado.");
      return;
    }
    // Check if material is already in the *currentProject's* budget
    if (currentProject.materials.some(pm => pm.materialId === materialToAddId)) {
        alert(`El material "${materialInfo.name}" ya está presupuestado en este proyecto.`);
 return;
    }
    // Check availability for reservation
    if (materialToAddBudgetedQty > (materialInfo.stock - materialInfo.reserved)) {
        alert(`No hay suficiente stock disponible de "${materialInfo.name}" (Disponibles para reservar: ${materialInfo.stock - materialInfo.reserved}) para la cantidad presupuestada ${materialToAddBudgetedQty}.`);
        return;
    }
    
    const materialDetailsToAdd = {
      materialId: materialInfo.id,
      materialName: materialInfo.name,
      materialUnit: materialInfo.unit,
      budgetedQuantity: materialToAddBudgetedQty,
      actualQuantity: 0 // Assuming initial actual quantity is 0
    };

    try {
      await refetchProjects(); // Refetch projects after adding material
      alert(`"${materialInfo.name}" agregado al presupuesto.`);
      // Reset form fields and ideally refetch/update project state to reflect changes
      setMaterialToAddId('');
      setMaterialToAddBudgetedQty(1);
      // Refetch the project to update the UI
      const updatedProject = await getProjectById(currentProject.id);
 if (updatedProject) setCurrentProject(updatedProject);
    } catch (error) {
 console.error("Error adding material to project in Firestore:", error);
      console.error("Error adding material to project in Firestore:", error);
      alert("Error al agregar material al proyecto.");
    }
  };

  const handleRemoveMaterialFromProjectBudget = async (materialIdToRemove: string) => {
    if (!currentProject) {
        console.error("handleRemoveMaterialFromProjectBudget: Local project state not loaded.");
        alert("Error: No se pudo quitar el material. El proyecto no está cargado.");
        return;
    }
    const materialName = currentProject.materials.find(pm => pm.materialId === materialIdToRemove)?.materialName || "este material";
    const materialToRemove = currentProject.materials.find(pm => pm.materialId === materialIdToRemove);

    if (!materialToRemove) {
        console.error(`Material with ID ${materialIdToRemove} not found in current project's materials.`);
        alert("Error interno: Material no encontrado en el proyecto.");
        return;
    }

    if (window.confirm(`¿Está seguro de que desea quitar "${materialName}" del presupuesto de este proyecto? Se liberará la cantidad reservada.`)) {
      try {
        // Pass the full material object to remove
        await refetchProjects(); // Refetch projects after removing material
        alert(`"${materialName}" quitado del presupuesto.`);
        // Refetch the project to update the UI
        const updatedProject = await getProjectById(currentProject.id);
        if(updatedProject) setCurrentProject(updatedProject);
      } catch (error) {
        console.error("Error removing material from project in Firestore:", error);
        alert("Error al quitar material del proyecto.");
      }
    }
  };

  
  // Memoize available materials for adding to prevent unnecessary recalculations
  const availableMaterialsForAdding = useMemo(() => {

    console.log("Recalculando availableMaterialsForAdding...");
    console.log("Materials disponibles (prop):", materials);
 console.log("Materiales en el proyecto actual:", currentProject ? currentProject.materials : null); // <-- Log currentProject.materials

    if (!currentProject || materials.length === 0) {
        return [];
    }

    const projectMaterialIds = currentProject.materials.map(pm => pm.materialId);
 const filteredMaterials = materials.filter(m => !projectMaterialIds.includes(m.id));
    console.log("Materiales disponibles DESPUÉS de filtrar:", filteredMaterials); // <-- Changed log message
    return filteredMaterials;
  }, [materials, currentProject]);
 // Added a check for materials
   if (materials.length === 0) {
     return <div className="text-center py-10 text-gray-700">Cargando materiales...</div>;
   }
 // Render loading state or "not found" if currentProject is null and not loading
 if (loading || !currentProject) {
    return <div className="text-center py-10 text-gray-700">Cargando detalle del trabajo o proyecto no encontrado...</div>;
  }

  // Removed the redundant !currentProject && !loading check as the one above covers it
  if (!currentProject && !loading) {
    return <div className="text-center py-10 text-gray-700">Cargando detalle del trabajo o proyecto no encontrado...</div>;
  }

  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Detalle Trabajo (Nº Presupuesto: {currentProject.description})</h1>
        <p className="text-md text-gray-600 mb-1">Cliente: <span className="font-medium">{currentProject.client}</span></p>
        <p className="text-md text-gray-600 mb-1">Fecha de Inicio: <span className="font-medium">{new Date(currentProject.startDate).toLocaleDateString()}</span></p>
        <p className="text-md text-gray-600 mb-1">Días Estimados: <span className="font-medium">{currentProject.estimatedDays || 'N/A'}</span></p>
        <p className="text-md text-gray-600">Estado: <span className={`font-medium ${currentProject.status === ProjectStatus.COMPLETADO ? 'text-green-600' : 'text-yellow-600'}`}>{currentProject.status}</span></p>
      </div>

      {currentProject.status === ProjectStatus.PENDIENTE && (
        <>
          <div className="space-y-4 border-t border-b border-gray-200 py-6">
            <h2 className="text-xl font-semibold text-gray-700">Modificar Presupuesto de Materiales</h2>
            <div className="p-4 border border-dashed border-gray-300 rounded-md space-y-3 bg-gray-50">
              <h3 className="text-md font-medium text-gray-600">Agregar Material al Presupuesto</h3>
              <div className="flex flex-col sm:flex-row items-end gap-2">
                <div className="flex-grow w-full sm:w-auto">
                  <label htmlFor="materialToAdd" className="block text-sm font-medium text-gray-700">Material</label>
                  <select
                    id="materialToAdd"
                    value={materialToAddId}
                    onChange={(e) => setMaterialToAddId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="">Seleccione un material...</option>
                    {availableMaterialsForAdding.map(m => (
                      <option key={m.id} value={m.id} disabled={(m.stock - m.reserved) <= 0}>
                        {m.name} (Disponible p/ reservar: {m.stock - m.reserved} {m.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-full sm:w-1/4">
                  <label htmlFor="materialToAddBudgetedQty" className="block text-sm font-medium text-gray-700">Cantidad</label>
                  <input
                    type="number"
                    id="materialToAddBudgetedQty"
                    value={materialToAddBudgetedQty}
                    onChange={(e) => setMaterialToAddBudgetedQty(Math.max(1, parseInt(e.target.value,10) || 1))}
                    min="1"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddMaterialToProjectBudget}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400 flex items-center self-end h-10 w-full sm:w-auto justify-center"
                  aria-label="Agregar material seleccionado al presupuesto"
                >
                  <PlusIcon className="w-5 h-5 mr-1" /> Agregar
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h2 className="text-xl font-semibold text-gray-700">Ajuste de Materiales (Presupuestado vs. Replanteado)</h2>
            <p className="text-sm text-gray-500">Aquí puede ajustar la cantidad de material *realmente utilizada* (replanteo). Los cambios en el presupuesto (agregar/quitar materiales) se hacen en la sección superior.</p>
            {editedMaterials.length === 0 && <p className="text-gray-500">No hay materiales presupuestados para este proyecto.</p>}
            {editedMaterials.map(pm => {
                const stockMaterial = materials.find(m => m.id === pm.materialId);
               return (
              <div key={pm.materialId} className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-2 items-center border-b pb-3">
                <div className="md:col-span-2">
                  <p className="font-medium text-gray-700">{pm.materialName}</p>
                  <p className="text-xs text-gray-500">{pm.materialUnit}</p>
                </div>
                <div className="md:col-span-1">
                  <label htmlFor={`budgeted-${pm.materialId}`} className="block text-xs font-medium text-gray-500">Presupuestado</label>
                  <input
                    type="number"
                    id={`budgeted-${pm.materialId}`}
                    value={pm.budgetedQuantity}
                    disabled
                    aria-label={`Cantidad presupuestada para ${pm.materialName}`}
                    className="mt-1 w-full px-2 py-1 border border-gray-300 rounded-md bg-gray-100 sm:text-sm"
                  />
                </div>
                <div className="md:col-span-1">
                  <label htmlFor={`actual-${pm.materialId}`} className="block text-xs font-medium text-gray-500">Replanteado (Real Usado)</label>
                  <input
                    type="number"
                    id={`actual-${pm.materialId}`}
                    value={pm.actualQuantity} 
                    onChange={(e) => handleMaterialQuantityChange(pm.materialId, e.target.value)}
                    min="0"
                    aria-label={`Cantidad replanteada para ${pm.materialName}`}
                    className="mt-1 w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                 <div className="md:col-span-4 flex justify-end mt-1 md:mt-0">
                    <button
                        type="button"
                        onClick={() => handleRemoveMaterialFromProjectBudget(pm.materialId)}
                        className="text-red-500 hover:text-red-700 text-xs p-1 flex items-center"
                        title={`Quitar ${pm.materialName} del presupuesto`}
                        aria-label={`Quitar ${pm.materialName} del presupuesto`}
                    >
                        <TrashIcon className="w-4 h-4 mr-1" /> Quitar del Presupuesto
                    </button>
                 </div>
                 {stockMaterial && <p className="text-xs text-gray-400 mt-0 md:col-span-4">Stock total en inventario: {stockMaterial.stock}, Reservado total en inventario: {stockMaterial.reserved}</p>}
              </div>
               )
            })}
          </div>
        </>
      )}
      {currentProject.status === ProjectStatus.COMPLETADO && (
         <div className="space-y-4 pt-2">
            <h2 className="text-xl font-semibold text-gray-700">Resumen de Materiales Utilizados</h2>
            {editedMaterials.length === 0 && <p className="text-gray-500">No se registraron materiales para este proyecto.</p>}
            {editedMaterials.map(pm => (
              <div key={pm.materialId} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-b pb-3">
                <div className="md:col-span-1">
                  <p className="font-medium text-gray-700">{pm.materialName}</p>
                  <p className="text-xs text-gray-500">{pm.materialUnit}</p>
                </div>
                <div className="md:col-span-1">
                  <p className="text-xs font-medium text-gray-500">Presupuestado</p>
                  <p className="sm:text-sm text-gray-800">{pm.budgetedQuantity}</p>
                </div>
                 <div className="md:col-span-1">
                  <p className="text-xs font-medium text-gray-500">Real Utilizado</p>
                  <p className="sm:text-sm text-gray-800">{pm.actualQuantity}</p>
                </div>
              </div>
            ))}
         </div>
      )}


      <div className="mt-8 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
        <button
            onClick={() => navigate(currentProject.status === ProjectStatus.COMPLETADO ? '/trabajos-completados' : '/trabajos-pendientes')}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 order-1 sm:order-none"
          >
            {currentProject.status === ProjectStatus.COMPLETADO ? 'Volver a Completados' : 'Volver a Pendientes'}
        </button>
        {currentProject.status === ProjectStatus.PENDIENTE && (
            <>
                <button
                onClick={handleSaveChanges}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 order-2 sm:order-none"
                >
                Guardar Cambios en Replanteo
                </button>
                <button
                onClick={handleCompleteWork}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center justify-center order-3 sm:order-none"
                >
                <CheckCircleIcon className="w-5 h-5 mr-2" /> Finalizar Trabajo
                </button>
            </>
        )}
      </div>
    </div>
  );
};

export default DetalleTrabajoPendiente;
