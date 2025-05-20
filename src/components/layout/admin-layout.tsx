"use client";

import { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminTopbar } from "@/components/layout/admin-topbar";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Check if sidebar is collapsed from localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('admin-sidebar-collapsed');
    if (savedCollapsed) {
      setSidebarCollapsed(savedCollapsed === 'true');
    }
    
    // Listen for the custom sidebar-toggle event for immediate updates
    const handleSidebarToggle = (e: CustomEvent) => {
      setSidebarCollapsed(e.detail.collapsed);
    };
    
    // Listen for storage events for cross-tab synchronization
    const handleStorageChange = () => {
      const newCollapsedState = localStorage.getItem('admin-sidebar-collapsed') === 'true';
      setSidebarCollapsed(newCollapsedState);
    };
    
    // Add event listeners
    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    window.addEventListener('storage', handleStorageChange);
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <AdminTopbar />
      <div className={`transition-all duration-300 ease-in-out pt-14 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
} 