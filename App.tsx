import React, { useState, useEffect, useCallback } from 'react';

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import StockOverview from './components/StockOverview';
import RegisterWorkForm from './components/RegisterWorkForm';
import PendingWorkList from './components/ListaTrabajosPendientes';
import PendingWorkDetail from './components/DetalleTrabajoPendiente';
import CompletedJobsList from './components/ListaTrabajosCompletados';
import IncomeForm from './components/FormularioIngresos'; 
import OutcomeForm from './components/FormularioEgresos'; 
import MovementHistory from './components/HistorialMovimientos'; // New component
import { Material, Project, ProjectStatus, StockSummary, ProjectMaterial, MovementItem, MovementTransaction, ProjectData } from './types';
import { INITIAL_MATERIALS } from './constants';
import * as firebaseService from './firebaseService'; // Import as firebaseService to avoid naming conflict

const App: React.FC = () => {
  const [loadingInitialData, setLoadingInitialData] = useState<boolean>(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [movementHistory, setMovementHistory] = useState<MovementTransaction[]>([]);
  const [stockSummary, setStockSummary] = useState<StockSummary>({
    totalStockValue: 0,
    totalAvailable: 0,
    totalReserved: 0,
  });

 // Helper function to calculate stock summary
 const calculateStockSummary = useCallback(() => {
    let totalStock = 0;
    let totalReservedCalculated = 0;
    let totalAvailable = 0;
 materials.forEach(material => {
 totalStock += material.stock;
 totalReservedCalculated += material.reserved;
 totalAvailable += (material.stock - material.reserved);
 });
 setStockSummary({ totalStockValue: totalStock, totalAvailable: totalAvailable, totalReserved: totalReservedCalculated });
  }, [materials, setStockSummary]);

 // Helper function to load materials from local storage as a fallback
 const loadMaterialsFromLocalStorage = useCallback(() => {
    const savedMaterialsString = localStorage.getItem('stockcontrol_materials'); // Still using local storage for initial fallback
    let baseMaterials: Material[] = INITIAL_MATERIALS.map(m => ({...m, category: m.category || 'General' , reserved: 0 }));
    if (savedMaterialsString) {
          try {
              const parsedMaterials = JSON.parse(savedMaterialsString);
              if (Array.isArray(parsedMaterials) && parsedMaterials.length > 0) {
                 baseMaterials = parsedMaterials.map(m => ({...m, category: m.category || 'General', reserved: 0}));
            } else if (Array.isArray(parsedMaterials) && parsedMaterials.length === 0 && INITIAL_MATERIALS.length > 0) {
                 baseMaterials = INITIAL_MATERIALS.map(m => ({...m, category: m.category || 'General', reserved: 0 }));
            }
        } catch (e) {
            console.error("Failed to parse materials from localStorage, using initial materials.", e);
        }
    }
     setMaterials(baseMaterials); // Load base materials without reserved calculated yet
 }, [setMaterials, INITIAL_MATERIALS]);

 // Fetch materials from Firebase or use fallback
  const fetchMaterials = useCallback(async () => {
    try {
      const dbMaterials = await firebaseService.getMaterials();
      console.log("Datos de materiales recuperados de Firebase:", dbMaterials); // <-- Nuevo console.log aquí
      if (dbMaterials && dbMaterials.length > 0) {
        setMaterials(dbMaterials.map(m => ({ ...m, reserved: 0 }))); // Load base materials from DB without reserved calculated yet
      } else {
        // If database is empty, use localStorage or initial materials
        loadMaterialsFromLocalStorage();
      }
    } catch (error) {
      console.error("Error fetching materials from Firebase:", error);
      // Fallback to localStorage or initial materials on error
      loadMaterialsFromLocalStorage();
    }
  }, [setMaterials, loadMaterialsFromLocalStorage]); // Added loadMaterialsFromLocalStorage as dependency

  const fetchProjects = useCallback(async () => {
      try {
        const dbProjects = await firebaseService.getProjects();
        if (dbProjects) {
          setProjects(dbProjects);
        } else {
          console.log("No projects found in Firebase or failed to fetch.");
        }
      } catch (error) {
        console.error("Error fetching projects from Firebase:", error);
      }
    }, [setProjects]);

  // Initial data fetching (materials and projects)
  useEffect(() => {
    const loadedMovementHistory: MovementTransaction[] = localStorage.getItem('stockcontrol_movement_history') ? JSON.parse(localStorage.getItem('stockcontrol_movement_history')!) : []; // Still loading movement history from local storage
    
    const loadInitialData = async () => {
 await fetchMaterials();
      await fetchProjects();
      setMovementHistory(loadedMovementHistory);
      setLoadingInitialData(false); // Set loading to false after both fetches
    }
    loadInitialData();

  }, []);

  // Effect to calculate and set reserved materials whenever projects change
 useEffect(() => {
    const pendingProjs = projects.filter(p => p.status === ProjectStatus.PENDIENTE);
    const reservations: Record<string, number> = {};
    pendingProjs.forEach(project => {
        project.materials.forEach(pm => {
            reservations[pm.materialId] = (reservations[pm.materialId] || 0) + pm.budgetedQuantity;
        });
    });

    // Calculate the new materials state based on calculated reservations
    const newMaterialsWithReservations = materials.map(mat => {
      return { ...mat, reserved: reservations[mat.id] || 0 };
    });

    // Compare the new materials state with the current state
    // Check if the reserved quantities have actually changed
    const hasReservedChanged = newMaterialsWithReservations.some((newMat, index) => {
        const oldMat = materials[index];
        return newMat.reserved !== oldMat.reserved;
    });

    // Only update state if reservations have changed to avoid infinite loop
    if (hasReservedChanged) {
      setMaterials(newMaterialsWithReservations);
    }

  }, [projects, materials]); // Ensure both projects and materials are dependencies

  // Effect to save data to localStorage and calculate stock summary whenever relevant state changes
  useEffect(() => {
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


  const addProject = async (projectData: Omit<Project, 'id'>) => {
    try {
      // Add the project to Firestore
      // Note: The firebaseService.addProject function expects ProjectData, which is Omit<Project, 'id'>
      // This matches the type of projectData received here.
      const projectId = await firebaseService.addProject(projectData);

      // Update local state with the project including the Firestore ID
      const newProjectWithId: Project = { ...projectData, id: projectId };
      setProjects(prev => [...prev, newProjectWithId]);
    } catch (error) {
      console.error("Error adding project to Firebase:", error);      
      alert("Error al registrar el trabajo. Intente de nuevo."); // User feedback
    }
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


  if (loadingInitialData) {
    return <div className="text-center py-10 text-gray-700">Cargando datos iniciales...</div>;
  }

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
                refetchProjects={fetchProjects}
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