
import React, { useState, useMemo } from 'react';
import { MovementTransaction } from '../types';
import { ArrowUpTrayIcon, ArrowDownTrayIcon } from '../constants';

interface MovementHistoryProps {
  history: MovementTransaction[];
}

const MovementHistory: React.FC<MovementHistoryProps> = ({ history }) => {
  const [filterType, setFilterType] = useState<'all' | 'Ingreso' | 'Egreso'>('all');
  const [searchTerm, setSearchTerm] = useState<string>(''); // For material name or budget target

  const filteredHistory = useMemo(() => {
    return history
      .filter(transaction => {
        if (filterType === 'all') return true;
        return transaction.type === filterType;
      })
      .filter(transaction => {
        if (!searchTerm.trim()) return true;
        const lowerSearchTerm = searchTerm.toLowerCase();
        // Check budget target (for Egresos)
        if (transaction.budgetTarget?.toLowerCase().includes(lowerSearchTerm)) {
          return true;
        }
        // Check material names
        return transaction.items.some(item => 
          item.materialName.toLowerCase().includes(lowerSearchTerm)
        );
      });
  }, [history, filterType, searchTerm]);

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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

      {filteredHistory.length === 0 ? (
        <p className="text-center text-gray-500 py-10">
          {history.length === 0 ? "No hay movimientos registrados." : "No hay movimientos que coincidan con los filtros aplicados."}
        </p>
      ) : (
        <div className="space-y-6">
          {filteredHistory.map(transaction => (
            <div key={transaction.id} className={`p-4 border rounded-lg ${transaction.type === 'Ingreso' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
                <div className="flex items-center">
                  {transaction.type === 'Ingreso' ? 
                    <ArrowUpTrayIcon className="w-6 h-6 text-green-600 mr-2" /> : 
                    <ArrowDownTrayIcon className="w-6 h-6 text-red-600 mr-2" />}
                  <h2 className={`text-xl font-semibold ${transaction.type === 'Ingreso' ? 'text-green-700' : 'text-red-700'}`}>
                    {transaction.type}
                  </h2>
                </div>
                <span className="text-sm text-gray-500 mt-1 sm:mt-0">{formatDate(transaction.date)}</span>
              </div>
              
              {transaction.type === 'Egreso' && transaction.budgetTarget && (
                <p className="text-sm text-gray-600 mb-2">
                  Referencia/Presupuesto: <span className="font-medium">{transaction.budgetTarget}</span>
                </p>
              )}

              <div>
                <h4 className="text-sm font-semibold text-gray-600 uppercase mb-1">Materiales Involucrados:</h4>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  {transaction.items.map(item => (
                    <li key={item.materialId} className="text-sm text-gray-700">
                      {item.materialName}: <span className="font-medium">{item.quantity} {item.materialUnit}</span>
                    </li>
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

export default MovementHistory;