
import React from 'react';
import Navbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <footer className="bg-primary-800 text-center text-white py-4 text-sm">
        © {new Date().getFullYear()} StockControl App. Todos los derechos reservados.
      </footer>
    </div>
  );
};

export default 
Layout;
    