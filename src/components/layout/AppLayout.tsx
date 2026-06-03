"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { 
  LayoutDashboard, 
  Package, 
  Database, 
  FileText, 
  ShoppingCart, 
  History, 
  LogOut, 
  User, 
  Search, 
  Bell, 
  ChevronLeft, 
  ChevronRight,
  Menu
} from "lucide-react";

interface TabItem {
  id: string;
  label: string;
  icon: any; // Lucide icon
}

interface AppLayoutProps {
  user: {
    name?: string | null;
    email?: string | null;
    role: string;
  };
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabs: TabItem[];
  children: React.ReactNode;
}

export default function AppLayout({
  user,
  activeTab,
  setActiveTab,
  tabs,
  children,
}: AppLayoutProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Admin Control";
      case "BUYER":
        return "Buyer Portal";
      default:
        return "Seller Portal";
    }
  };

  const getActiveTabLabel = () => {
    const tab = tabs.find((t) => t.id === activeTab);
    return tab ? tab.label : "Dashboard";
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 font-sans antialiased text-zinc-900 dark:text-zinc-100">
      
      {/* Container holding Left Rail and Right Workspace */}
      <div className="flex flex-1 relative overflow-hidden h-screen">
        
        {/* Navigation Rail (Desktop Only) */}
        <aside 
          className={`hidden md:flex flex-col justify-between border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all duration-300 z-30 ${
            isExpanded ? "w-[220px]" : "w-[72px]"
          }`}
        >
          {/* Rail Header / Logo */}
          <div className="p-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 h-[64px]">
            <div className="flex items-center space-x-3 overflow-hidden">
              <span className="font-mono text-xs font-bold bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 px-2 py-1 select-none">
                AASA
              </span>
              {isExpanded && (
                <span className="font-mono text-[10px] font-bold text-zinc-500 tracking-wider uppercase truncate">
                  Inventory Hub
                </span>
              )}
            </div>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 p-1"
            >
              {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>

          {/* Rail Navigation Links */}
          <nav className="flex-1 py-4 space-y-1 px-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 transition-colors font-mono text-xs font-bold uppercase tracking-wider ${
                    isActive 
                      ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 border border-zinc-950 dark:border-zinc-100" 
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 border border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-850"
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  {isExpanded && <span className="truncate">{tab.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Rail Footer / User Section */}
          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
            {isExpanded && (
              <div className="px-2 py-1.5 border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <p className="text-[10px] font-bold uppercase text-zinc-400 font-mono tracking-wider truncate">
                  {user.name || "User Account"}
                </p>
                <p className="text-[9px] font-mono text-zinc-500 truncate mt-0.5">
                  {user.email}
                </p>
                <div className="inline-block mt-1.5 px-1.5 py-0.5 text-[8px] font-bold uppercase font-mono bg-zinc-950 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-950">
                  {getRoleLabel(user.role)}
                </div>
              </div>
            )}

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className={`w-full flex items-center space-x-3 px-3 py-2 transition-colors font-mono text-xs font-bold uppercase tracking-wider text-red-650 hover:text-red-700 border border-transparent hover:bg-red-50/50`}
            >
              <LogOut size={16} className="shrink-0" />
              {isExpanded && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* Right workspace wrapper */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Transparent Top Navbar */}
          <header className="h-[64px] border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md z-20 shrink-0">
            
            {/* Left: Dynamic Breadcrumb / Page Title */}
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-zinc-400">AASA</span>
              <span className="text-zinc-300">/</span>
              <span className="font-mono text-xs font-bold text-zinc-500 uppercase">
                {getRoleLabel(user.role)}
              </span>
              <span className="text-zinc-300">/</span>
              <span className="font-mono text-xs font-bold text-zinc-950 dark:text-zinc-50 uppercase tracking-wide">
                {getActiveTabLabel()}
              </span>
            </div>

            {/* Right: Search, Notifications, Profile Indicator */}
            <div className="flex items-center space-x-4">
              
              {/* Search Placeholder */}
              <div className="hidden sm:flex items-center space-x-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-1 font-mono text-[10px]">
                <Search size={12} className="text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="SEARCH HUB (CMD+K)" 
                  className="bg-transparent border-none outline-none text-zinc-700 dark:text-zinc-300 w-36 focus:w-48 transition-all uppercase placeholder-zinc-400"
                  disabled
                />
              </div>

              {/* Alerts bell */}
              <button className="relative text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50 p-1 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800">
                <Bell size={16} />
                <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-amber-500"></span>
              </button>

              {/* Profile icon */}
              <div className="flex items-center space-x-2 border-l border-zinc-200 dark:border-zinc-800 pl-4 h-6">
                <div className="w-6 h-6 border border-zinc-950 dark:border-zinc-100 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 font-mono text-[10px] font-bold">
                  {user.email ? user.email.slice(0, 2).toUpperCase() : "US"}
                </div>
              </div>
            </div>
          </header>

          {/* Bounded Industrial Workspace */}
          <main className="flex-1 overflow-y-auto p-6 bg-zinc-50 dark:bg-zinc-950">
            <div className="min-h-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 relative">
              {children}
            </div>
          </main>
        </div>

      </div>

      {/* Mobile Bottom Navigation Bar (Fallback) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-[56px] bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex justify-around items-center z-40 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[9px] font-mono uppercase font-bold tracking-wider ${
                isActive ? "text-zinc-950 dark:text-zinc-50" : "text-zinc-400 hover:text-zinc-650"
              }`}
            >
              <Icon size={16} />
              <span className="mt-1 truncate max-w-[64px]">{tab.label.split(" ")[0]}</span>
            </button>
          );
        })}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-[9px] font-mono uppercase font-bold tracking-wider text-red-500"
        >
          <LogOut size={16} />
          <span className="mt-1">Exit</span>
        </button>
      </div>
      
    </div>
  );
}
