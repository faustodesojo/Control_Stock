
import React from 'react';
import { NavLink } from 'react-router-dom';
import { APP_TITLE } from '../constants';

const Navbar: React.FC = () => {
  const linkClass = "px-3 py-2 rounded-md text-sm font-medium";
  const activeLinkClass = "bg-primary-700 text-white";
  const inactiveLinkClass = "text-gray-300 hover:bg-primary-600 hover:text-white";

  return (
    <nav className="bg-primary-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <span className="font-bold text-xl text-white">{APP_TITLE}</span>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <NavLink 
                to="/" 
                className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}
              >
                Visión General
              </NavLink>
              <NavLink 
                to="/registrar-trabajo"
                className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}
              >
                Registrar Trabajo
              </NavLink>
              <NavLink 
                to="/trabajos-pendientes"
                className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}
              >
                Trabajos Pendientes
              </NavLink>
              <NavLink 
                to="/trabajos-completados"
                className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}
              >
                Trabajos Completados
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
    