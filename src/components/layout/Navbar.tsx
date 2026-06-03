"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";

interface NavbarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role: "ADMIN" | "USER" | "BUYER";
  };
}

export default function Navbar({ user }: NavbarProps) {
  const getDashboardLabel = () => {
    switch (user.role) {
      case "ADMIN":
        return "Admin Dashboard";
      case "BUYER":
        return "Buyer Dashboard";
      case "USER":
      default:
        return "Seller Dashboard";
    }
  };

  const getDashboardHref = () => {
    return user.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";
  };

  return (
    <nav className="bg-slate-900 text-white px-6 py-4 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <span className="font-bold text-xl tracking-tight text-indigo-400">
            Aasa Inventory Hub
          </span>
          <div className="hidden md:flex space-x-4 text-sm font-medium text-slate-300">
            <Link href={getDashboardHref()} className="hover:text-white px-3 py-2 rounded">
              {getDashboardLabel()}
            </Link>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold">{user.name || user.email}</p>
            <p className="text-xs text-indigo-400 font-mono capitalize">{user.role.toLowerCase()}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="bg-red-650 hover:bg-red-750 text-white text-xs font-semibold px-4 py-2 rounded transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
