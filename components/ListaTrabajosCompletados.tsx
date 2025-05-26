import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus } from '../types';
// import { EyeIcon } from '../constants'; // Assuming you might add a view detail later
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseService'; // Import db from firebaseService
interface CompletedJobsListProps {
  // projects: Project[]; // Removed prop
}
const ListaTrabajosCompletados: React.FC<CompletedJobsListProps> = () => { // Removed projects from destructuring
  const [completedProjects, setCompletedProjects] = useState<Project[]>([]); // State for completed projects
  const [loading, setLoading] = useState<boolean>(true); // Loading state
  useEffect(() => {
    const fetchCompletedProjects = async () => {
      setLoading(true);
      try {
        // Create a query to get projects where status is 'COMPLETADO'
        const q = query(collection(db, 'proyectos'), where('status', '==', ProjectStatus.COMPLETADO));
        const querySnapshot = await getDocs(q);
        const projectsData: Project[] = [];
        querySnapshot.forEach((doc) => {
          // Include the document ID and cast the data to Project type
          projectsData.push({ id: doc.id, ...doc.data() as Omit<Project, 'id'> });
        });
        setCompletedProjects(projectsData);
      } catch (error) {
        console.error("Error fetching completed projects: ", error);
        // Optionally show an error message to the user
      } finally {
        setLoading(false);
      }
    };
    fetchCompletedProjects();
  }, []); // Empty dependency array means this effect runs once on mount
  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Trabajos Completados</h1>
      {projects.length === 0 ? (
        <p className="text-center text-gray-500 py-4">No hay trabajos completados.</p>
      ) : (
        <div className="space-y-4">
          {completedProjects.map(project => ( // Use completedProjects state
            <div key={project.id} className="p-4 border border-gray-200 rounded-lg bg-green-50">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-green-700">Nº Presupuesto: {project.description}</h2>
                  <p className="text-sm text-gray-600">Cliente: {project.client}</p>
                  <p className="text-sm text-gray-600">Fecha de Inicio: {new Date(project.startDate).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-600">Días Estimados: {project.estimatedDays || 'N/A'}</p>
                  <p className="text-sm text-gray-600">Fecha de Finalización: {project.completionDate ? new Date(project.completionDate).toLocaleDateString() : 'N/A'}</p>
                  <p className="text-sm text-gray-600">Estado: <span className="font-medium text-green-600">{project.status}</span></p>
                </div>
                {/* Future: Link to view details of completed job if needed */}
                {/* <button 
                      className="mt-2 sm:mt-0 px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-300 flex items-center"
                      aria-label={`Ver detalles del trabajo completado ${project.description}`}
                    >
                  <EyeIcon className="w-4 h-4 mr-1" /> Ver Detalles
                </button> */}
              </div>
              <div className="mt-3 pt-3 border-t border-green-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Materiales Utilizados (Replanteado):</h4>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  {project.materials.map(pm => (
                    <li key={pm.materialId}>{pm.materialName}: {pm.actualQuantity} {pm.materialUnit}</li>
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
export default ListaTrabajosCompletados;