
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import StockOverview from './components/StockOverview';
import RegisterWorkForm from './components/RegisterWorkForm';
import PendingWorkList from './components/PendingWorkList';
import PendingWorkDetail from './components/PendingWorkDetail';
import CompletedJobsList from './components/CompletedJobsList';
import { Material, Project, ProjectStatus, StockSummary, ProjectMaterial } from './types';
import { INITIAL_MATERIALS } from './constants';

const API_URL = 'http://localhost:3001/api/productos';

const App: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stockSummary, setStockSummary] = useState<StockSummary>({
    totalStockValue: 0,
    totalAvailable: 0,
    totalReserved: 0,
  });

  useEffect(() => {
    const savedProjectsString = localStorage.getItem('stockcontrol_projects');
    const loadedProjects: Project[] = savedProjectsString ? JSON.parse(savedProjectsString) : [];
    

    fetch(API_URL)
    .then(res => res.json())
    .then(data => {
      // Calcular reservas en base a proyectos pendientes
      const pendingProjs = loadedProjects.filter(p => p.status === ProjectStatus.PENDIENTE);
      const reservations: Record<string, number> = {};
      pendingProjs.forEach(project => {
        project.materials.forEach(pm => {
          reservations[pm.materialId] = (reservations[pm.materialId] || 0) + pm.budgetedQuantity;
        });
      });
  
      const correctedMaterials = data.map((m: any) => ({
        ...m,
        id: m.id.toString(), // Convertir id numérico a string para consistencia
        reserved: reservations[m.id.toString()] || 0
      }));
  
      setMaterials(correctedMaterials);
    });
  

  }, []);


  const calculateStockSummary = useCallback(() => {
    let totalStock = 0;
    let totalReservedCalculated = 0;
    let totalAvailable = 0;

    materials.forEach(material => {
      totalStock += material.stock;
      totalReservedCalculated += material.reserved;
      totalAvailable += (material.stock - material.reserved);
    });

    setStockSummary({
      totalStockValue: totalStock,
      totalAvailable: totalAvailable,
      totalReserved: totalReservedCalculated,
    });
  }, [materials]);

  useEffect(() => {
    // Save to localStorage whenever materials or projects change
    localStorage.setItem('stockcontrol_projects', JSON.stringify(projects));
    calculateStockSummary(); // Recalculate summary after changes
  }, [materials, projects, calculateStockSummary]);


  const addMaterialHandler = async (newMaterialData: Omit<Material, 'id' | 'reserved'>) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto: newMaterialData.name,
          categoria: newMaterialData.category || 'General',
          cantidad: newMaterialData.stock
        }),
      });
  
      const data = await response.json();
  
      setMaterials(prev => [
        ...prev,
        {
          ...newMaterialData,
          id: data.id.toString(),
          reserved: 0,
          category: newMaterialData.category || 'General',
        },
      ]);
    } catch (error) {
      console.error('Error agregando material:', error);
    }
  };
  

  const removeMaterialHandler = async (materialId: string) => {
    const materialToRemove = materials.find(m => m.id === materialId);
  
    if (!materialToRemove) return alert("Material no encontrado.");
    if (materialToRemove.reserved > 0) {
      return alert(`Material "${materialToRemove.name}" no puede eliminarse porque tiene ${materialToRemove.reserved} reservados.`);
    }
  
    try {
      await fetch(`${API_URL}/${materialId}`, { method: 'DELETE' });
      setMaterials(prev => prev.filter(m => m.id !== materialId));
    } catch (error) {
      console.error('Error eliminando material:', error);
    }
  };
  


  const addProject = (project: Project) => {
    setProjects(prev => [...prev, project]);
    // Update reservations for materials used in the new project
    setMaterials(prevMaterials =>
      prevMaterials.map(mat => {
        const projectMat = project.materials.find(pm => pm.materialId === mat.id);
        if (projectMat) {
          return {
            ...mat,
            reserved: mat.reserved + projectMat.budgetedQuantity,
          };
        }
        return mat;
      })
    );
  };

  const updateProject = (updatedProject: Project) => {
    // This function is for saving changes like 'actualQuantity' (replanteo).
    // It does NOT affect material reservations or stock directly.
    // Stock and reservations are adjusted upon project completion or budget changes.
    setProjects(prevProjects =>
      prevProjects.map(p => {
        if (p.id === updatedProject.id) {
          // Ensure deep copy of materials array and its items
          return {
            ...updatedProject,
            materials: updatedProject.materials.map(m => ({ ...m })), 
          };
        }
        return p;
      })
    );
  };

  const addMaterialToExistingProject = (
    projectId: string, 
    materialDetails: { id: string; name: string; unit: string }, 
    budgetedQuantity: number
  ) => {
    setProjects(prevProjects => prevProjects.map(p => {
      if (p.id === projectId) {
        // Prevent adding if material already exists in this project's budget
        if (p.materials.some(pm => pm.materialId === materialDetails.id)) {
          // Alerting here might be disruptive, component should ideally prevent this call
          console.warn(`Material ${materialDetails.name} already in project ${projectId}`);
          return p; 
        }
        const newProjectMaterial: ProjectMaterial = {
          materialId: materialDetails.id,
          materialName: materialDetails.name,
          materialUnit: materialDetails.unit,
          budgetedQuantity: budgetedQuantity,
          actualQuantity: budgetedQuantity, // Initially, actual is same as budgeted
        };
        // Create new project object with new materials array
        return { ...p, materials: [...p.materials, newProjectMaterial] };
      }
      return p;
    }));

    // Update reservation for the added material
    setMaterials(prevMaterials => prevMaterials.map(m => {
      if (m.id === materialDetails.id) {
        // Create new material object with updated reservation
        return { ...m, reserved: m.reserved + budgetedQuantity };
      }
      return m;
    }));
  };

  const removeMaterialFromExistingProject = (projectId: string, materialIdToRemove: string) => {
    let removedBudgetedQuantity = 0;

    setProjects(prevProjects => prevProjects.map(p => {
      if (p.id === projectId) {
        const materialBeingRemoved = p.materials.find(pm => pm.materialId === materialIdToRemove);
        if (materialBeingRemoved) {
          removedBudgetedQuantity = materialBeingRemoved.budgetedQuantity;
        }
        // Create new project object with filtered materials array
        return { ...p, materials: p.materials.filter(pm => pm.materialId !== materialIdToRemove) };
      }
      return p;
    }));

    // If a material was actually removed and had a budgeted quantity, update reservations
    if (removedBudgetedQuantity > 0) {
      setMaterials(prevMaterials => prevMaterials.map(m => {
        if (m.id === materialIdToRemove) {
          // Create new material object with updated reservation
          return { ...m, reserved: Math.max(0, m.reserved - removedBudgetedQuantity) };
        }
        return m;
      }));
    }
  };


  const completeProject = (projectId: string, finalMaterialsFromProject: ProjectMaterial[]) => {
    const projectToComplete = projects.find(p=>p.id === projectId);
    if (!projectToComplete) {
      console.error("Project to complete not found:", projectId);
      return;
    }

    setProjects(prevProjects =>
      prevProjects.map(p => {
        if (p.id === projectId) {
          // Create new project object for the completed project
          return { 
            ...p, 
            status: ProjectStatus.COMPLETADO, 
            // Ensure deep copy of final materials
            materials: finalMaterialsFromProject.map(fm => ({...fm})), 
            completionDate: new Date().toISOString() 
          };
        }
        return p;
      })
    );

    // Adjust stock and reservations for materials
    setMaterials(prevMaterials =>
      prevMaterials.map(mat => {
        const materialUsedInProject = finalMaterialsFromProject.find(pm => pm.materialId === mat.id);
        const originalBudgetedForProject = projectToComplete.materials.find(pm => pm.materialId === mat.id);

        if (originalBudgetedForProject) { // If this material was part of the project's budget
          const actualQuantityUsed = materialUsedInProject ? materialUsedInProject.actualQuantity : 0;
          const newStock = mat.stock - actualQuantityUsed;
          const newReserved = mat.reserved - originalBudgetedForProject.budgetedQuantity;
          
          // Create new material object with updated stock and reservations
          return {
            ...mat,
            stock: Math.max(0, newStock), // Prevent negative stock
            reserved: Math.max(0, newReserved), // Prevent negative reservations
          };
        }
        return mat; // Return original material if not affected
      })
    );
  };

  const pendingProjects = projects.filter(p => p.status === ProjectStatus.PENDIENTE);
  const completedProjects = projects.filter(p => p.status === ProjectStatus.COMPLETADO);

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route 
            path="/" 
            element={
              <StockOverview 
                materials={materials} 
                summary={stockSummary} 
                addMaterial={addMaterialHandler}
                removeMaterial={removeMaterialHandler}
              />
            } 
          />
          <Route path="/registrar-trabajo" element={<RegisterWorkForm materials={materials} addProject={addProject} />} />
          <Route 
            path="/trabajos-pendientes" 
            element={<PendingWorkList projects={pendingProjects} allMaterials={materials} />} 
          />
          <Route 
            path="/trabajo/:projectId" 
            element={
              <PendingWorkDetail 
                projects={projects} // Pass all projects so detail can find its own
                materials={materials} // Pass all materials for reference and adding
                updateProject={updateProject} 
                completeProject={completeProject}
                addMaterialToExistingProject={addMaterialToExistingProject}
                removeMaterialFromExistingProject={removeMaterialFromExistingProject}
              />
            } 
          />
          <Route path="/trabajos-completados" element={<CompletedJobsList projects={completedProjects} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
