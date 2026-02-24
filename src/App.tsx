import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User as UserIcon, Building2, ClipboardList, ChevronRight, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './lib/api';
import { User } from './types';

// Pages
import Login from './pages/Login';
import AdminHome from './pages/AdminHome';
import AdminAccounts from './pages/AdminAccounts';
import AdminEnterpriseDetail from './pages/AdminEnterpriseDetail';
import ClientHome from './pages/ClientHome';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = api.user as User;

  const handleLogout = () => {
    api.token = null;
    api.user = null;
    navigate('/login');
  };

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-slate-900 hidden sm:block">企业考核管理系统</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <UserIcon className="w-4 h-4" />
              <span>{user.enterprise_name} ({user.username})</span>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>退出</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/admin" element={<Layout><AdminHome /></Layout>} />
        <Route path="/admin/accounts" element={<Layout><AdminAccounts /></Layout>} />
        <Route path="/admin/enterprises/:id" element={<Layout><AdminEnterpriseDetail /></Layout>} />
        
        <Route path="/client" element={<Layout><ClientHome /></Layout>} />
        
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
