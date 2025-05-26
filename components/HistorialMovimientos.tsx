import React, { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { ArrowUpTrayIcon, ArrowDownTrayIcon } from '../constants';
import { db } from '../firebaseService'; // Assuming db is exported from firebaseService

const HistorialMovimientos: React.FC = () => {
  const [filterType, setFilterType] = useState<'all' | 'Ingreso' | 'Egreso'>('all');
  const [searchTerm, setSearchTerm] = useState<string>(''); // For material name or budget target
  const [movements, setMovements] = useState<any[]>([]); // Use any initially for flexibility
  const [loading, setLoading] = useState<boolean>(true);

  const filteredHistory = useMemo(() => {
    // Filter based on the 'movements' state loaded from Firestore
    return movements
      .filter(movement => {
        if (filterType === 'all') return true;
        return movement.type === filterType;
      })
      .filter(movement => {
        if (!searchTerm.trim()) return true;
        const lowerSearchTerm = searchTerm.toLowerCase();
        // Check budget target (for Egresos)
        if (movement.type === 'Egreso' && movement.budgetTarget?.toLowerCase().includes(lowerSearchTerm)) {
          return true;
        }
        // Check material names within materialMovements array
        if (movement.materialMovements && Array.isArray(movement.materialMovements)) {
          // Concatenate all material names into a single string for searching
 return movement.materialMovements.some((item: any) =>
 item.materialName && item.materialName.toLowerCase().includes(lowerSearchTerm)
          );
        }
        // Fallback if no materialMovements array or search term doesn't match budget target
        // This might not be necessary if materialMovements is always present with names
        return false;
      });
  }, [movements, filterType, searchTerm]);

  useEffect(() => {
    const fetchMovements = async () => {
      setLoading(true);
      try {
        // Use 'timestamp' for more reliable chronological ordering
        const q = query(collection(db, 'movimientos'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        const movementsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMovements(movementsData);
      } catch (error) {
        console.error("Error fetching movements: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovements();
  }, []);

  const formatDate = (isoDate: string) => {
    // Handle potential Firestore Timestamp objects
    let date;
    if (isoDate && typeof isoDate === 'object' && typeof isoDate.toDate === 'function') {
      date = isoDate.toDate();
    } else {
      date = new Date(isoDate);
    }
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md text-center text-gray-500">
        Cargando historial de movimientos...
      </div>
    );
  }
  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Historial de Movimientos de Stock</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
        <div>
          <label htmlFor="filterType" className="block text-sm font-medium text-gray-700">Filtrar por Tipo:</label>
          <select
            id="filterType"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'Ingreso' | 'Egreso')}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          >
            <option value="all">Todos</option>
            <option value="Ingreso">Ingresos</option>
            <option value="Egreso">Egresos</option>
          </select>
        </div>
        <div>
          <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700">Buscar (Material o Ref.):</label>
          <input
            type="text"
            id="searchTerm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ej: Poste, P-123, Daño..."
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
      </div>

      {filteredHistory.length === 0 && movements.length === 0 ? (
        <p className="text-center text-gray-500 py-10">
 No hay movimientos registrados.
        </p>
      ) : filteredHistory.map(movement => (
        <div key={movement.id} className={`p-4 border rounded-lg ${movement.type === 'Ingreso' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
            <div className="flex items-center">
              {movement.type === 'Ingreso' ? 
                <ArrowUpTrayIcon className="w-6 h-6 text-green-600 mr-2" /> : 
                <ArrowDownTrayIcon className="w-6 h-6 text-red-600 mr-2" />}
              <h2 className={`text-xl font-semibold ${movement.type === 'Ingreso' ? 'text-green-700' : 'text-red-700'}`}>
                {movement.type}
              </h2>
            </div> 
            <span className="text-sm text-gray-500 mt-1 sm:mt-0">{formatDate(movement.date)}</span>
          </div>
      
          {movement.type === 'Egreso' && movement.budgetTarget && (
            <p className="text-sm text-gray-600 mb-2">
              Referencia/Presupuesto: <span className="font-medium">{movement.budgetTarget}</span>
            </p>
          )}
      
          <div>
            <h4 className="text-sm font-semibold text-gray-600 uppercase mb-1">Materiales Involucrados:</h4>
            {movement.materialMovements && Array.isArray(movement.materialMovements) && movement.materialMovements.length > 0 ? (
              <ul className="text-sm text-gray-700 ml-4">
                {movement.materialMovements.map((item: any, index: number) => (
                  <li key={index}>
                    <span className="font-medium">{item.materialName}</span>: {Math.abs(item.quantity)} {item.materialUnit}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 ml-4">No se especificaron materiales para este movimiento.</p>
            )}
          </div>
        </div>
      ))}
      </div>
       );
      }; 
export default HistorialMovimientos;