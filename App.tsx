
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import StockOverview from './components/StockOverview';
import RegisterWorkForm from './components/RegisterWorkForm';
import PendingWorkList from './components/PendingWorkList';
import PendingWorkDetail from './components/PendingWorkDetail';
import CompletedJobsList from './components/CompletedJobsList';
import IncomeForm from './components/IncomeForm'; 
import OutcomeForm from './components/OutcomeForm'; 
import MovementHistory from './components/MovementHistory'; // New component
import { Material, Project, ProjectStatus, StockSummary, ProjectMaterial, MovementItem, MovementTransaction } from './types';
import { INITIAL_MATERIALS } from './constants';

const App: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [movementHistory, setMovementHistory] = useState<MovementTransaction[]>([]);
  const [stockSummary, setStockSummary] = useState<StockSummary>({
    totalStockValue: 0,
    totalAvailable: 0,
    totalReserved: 0,
  });

  useEffect(() => {
    const savedProjectsString = localStorage.getItem('stockcontrol_projects');
    const loadedProjects: Project[] = savedProjectsString ? JSON.parse(savedProjectsString) : [];
    
    const savedMaterialsString = localStorage.getItem('stockcontrol_materials');
    let baseMaterials: Material[] = INITIAL_MATERIALS.map(m => ({...m, category: m.category || 'General' , reserved: 0 }));

    if (savedMaterialsString) {
        try {
            const parsedMaterials = JSON.parse(savedMaterialsString);
            if (Array.isArray(parsedMaterials) && parsedMaterials.length > 0) {
                 baseMaterials = parsedMaterials.map((m: Material) => ({
                    ...m,
                    category: m.category || 'General',
                    reserved: typeof m.reserved === 'number' ? m.reserved : 0 
                }));
            } else if (Array.isArray(parsedMaterials) && parsedMaterials.length === 0 && INITIAL_MATERIALS.length > 0) {
                 baseMaterials = INITIAL_MATERIALS.map(m => ({...m, category: m.category || 'General', reserved: 0 }));
            }
        } catch (e) {
            console.error("Failed to parse materials from localStorage, using initial materials.", e);
            baseMaterials = INITIAL_MATERIALS.map(m => ({...m, category: m.category || 'General', reserved: 0 }));
        }
    }
    
    const pendingProjs = loadedProjects.filter(p => p.status === ProjectStatus.PENDIENTE);
    const reservations: Record<string, number> = {};
    pendingProjs.forEach(project => {
        project.materials.forEach(pm => {
            reservations[pm.materialId] = (reservations[pm.materialId] || 0) + pm.budgetedQuantity;
        });
    });

    const correctedMaterials = baseMaterials.map(m => ({
        ...m,
        reserved: reservations[m.id] || 0 
    }));
    
    const savedMovementHistoryString = localStorage.getItem('stockcontrol_movement_history');
    const loadedMovementHistory: MovementTransaction[] = savedMovementHistoryString ? JSON.parse(savedMovementHistoryString) : [];

    setProjects(loadedProjects);
    setMaterials(correctedMaterials);
    setMovementHistory(loadedMovementHistory);

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
    localStorage.setItem('stockcontrol_materials', JSON.stringify(materials));
    localStorage.setItem('stockcontrol_projects', JSON.stringify(projects));
    localStorage.setItem('stockcontrol_movement_history', JSON.stringify(movementHistory));
    calculateStockSummary();
  }, [materials, projects, movementHistory, calculateStockSummary]);


  const addMaterialHandler = (newMaterialData: Omit<Material, 'id' | 'reserved'>) => {
    setMaterials(prev => [
      ...prev,
      {
        ...newMaterialData,
        id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        reserved: 0,
        category: newMaterialData.category || 'General',
      }
    ]);
  };

  const removeMaterialHandler = (materialId: string) => {
    const materialToRemove = materials.find(m => m.id === materialId);

    if (!materialToRemove) {
      console.warn(`Attempt to remove non-existent material ID: ${materialId}`);
      alert("Error: Material to remove not found.");
      return;
    }

    if (materialToRemove.reserved > 0) {
      alert(`Material "${materialToRemove.name}" cannot be removed: ${materialToRemove.reserved} ${materialToRemove.unit}(s) reserved.`);
      return;
    }
    
    setMaterials(prevMaterials => prevMaterials.filter(m => m.id !== materialId));
  };


  const addProject = (project: Project) => {
    setProjects(prev => [...prev, project]);
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
    setProjects(prevProjects =>
      prevProjects.map(p => {
        if (p.id === updatedProject.id) {
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
        if (p.materials.some(pm => pm.materialId === materialDetails.id)) {
          console.warn(`Material ${materialDetails.name} already in project ${projectId}`);
          return p; 
        }
        const newProjectMaterial: ProjectMaterial = {
          materialId: materialDetails.id,
          materialName: materialDetails.name,
          materialUnit: materialDetails.unit,
          budgetedQuantity: budgetedQuantity,
          actualQuantity: budgetedQuantity,
        };
        return { ...p, materials: [...p.materials, newProjectMaterial] };
      }
      return p;
    }));

    setMaterials(prevMaterials => prevMaterials.map(m => {
      if (m.id === materialDetails.id) {
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
        return { ...p, materials: p.materials.filter(pm => pm.materialId !== materialIdToRemove) };
      }
      return p;
    }));

    if (removedBudgetedQuantity > 0) {
      setMaterials(prevMaterials => prevMaterials.map(m => {
        if (m.id === materialIdToRemove) {
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
          return { 
            ...p, 
            status: ProjectStatus.COMPLETADO, 
            materials: finalMaterialsFromProject.map(fm => ({...fm})), 
            completionDate: new Date().toISOString() 
          };
        }
        return p;
      })
    );

    setMaterials(prevMaterials =>
      prevMaterials.map(mat => {
        const materialUsedInProject = finalMaterialsFromProject.find(pm => pm.materialId === mat.id);
        const originalBudgetedForProject = projectToComplete.materials.find(pm => pm.materialId === mat.id);

        if (originalBudgetedForProject) {
          const actualQuantityUsed = materialUsedInProject ? materialUsedInProject.actualQuantity : 0;
          const newStock = mat.stock - actualQuantityUsed;
          const newReserved = mat.reserved - originalBudgetedForProject.budgetedQuantity;
          
          return {
            ...mat,
            stock: Math.max(0, newStock),
            reserved: Math.max(0, newReserved),
          };
        }
        return mat;
      })
    );
  };

  const handleStockIncome = (itemsToIncome: MovementItem[], incomeDate: string) => {
    setMaterials(prevMaterials => {
      const updatedMaterials = [...prevMaterials];
      itemsToIncome.forEach(item => {
        const materialIndex = updatedMaterials.findIndex(mat => mat.id === item.materialId);
        if (materialIndex !== -1) {
          updatedMaterials[materialIndex] = {
            ...updatedMaterials[materialIndex],
            stock: updatedMaterials[materialIndex].stock + item.quantity,
          };
        }
      });
      return updatedMaterials;
    });

    const newTransaction: MovementTransaction = {
      id: `mov-${Date.now()}`,
      type: 'Ingreso',
      date: incomeDate,
      items: itemsToIncome,
    };
    setMovementHistory(prevHistory => [newTransaction, ...prevHistory]);
  };

  const handleStockOutcome = (itemsToOutcome: MovementItem[], outcomeDate: string, budgetTarget?: string) => {
    setMaterials(prevMaterials => {
      const updatedMaterials = [...prevMaterials];
      itemsToOutcome.forEach(item => {
        const materialIndex = updatedMaterials.findIndex(mat => mat.id === item.materialId);
        if (materialIndex !== -1) {
          const currentMat = updatedMaterials[materialIndex];
          const newStock = currentMat.stock - item.quantity;
          updatedMaterials[materialIndex] = {
            ...currentMat,
            stock: Math.max(currentMat.reserved, newStock), // Ensure stock doesn't go below reserved
          };
        }
      });
      return updatedMaterials;
    });
    
    const newTransaction: MovementTransaction = {
      id: `mov-${Date.now()}`,
      type: 'Egreso',
      date: outcomeDate,
      items: itemsToOutcome,
      budgetTarget: budgetTarget,
    };
    setMovementHistory(prevHistory => [newTransaction, ...prevHistory]);
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
          <Route 
            path="/registrar-ingreso" 
            element={<IncomeForm materials={materials} onStockIncome={handleStockIncome} />} 
          />
          <Route 
            path="/registrar-egreso" 
            element={<OutcomeForm materials={materials} onStockOutcome={handleStockOutcome} />} 
          />
          <Route 
            path="/historial-movimientos" 
            element={<MovementHistory history={movementHistory} />} 
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
                projects={projects} 
                materials={materials}
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