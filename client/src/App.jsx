import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import OrderLookupPage from './pages/OrderLookupPage';
import AdminPinPage from './pages/AdminPinPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

export default function App() {
  return (
    <div className="app-layout">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tra-cuu" element={<OrderLookupPage />} />
        <Route path="/quan-ly/pin" element={<AdminPinPage />} />
        <Route path="/quan-ly" element={<AdminDashboardPage />} />
      </Routes>
    </div>
  );
}
