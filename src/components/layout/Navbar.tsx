"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";

interface NavbarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role: "ADMIN" | "USER";
  };
}

export default function Navbar({ user }: NavbarProps) {
  return (
    <nav className="bg-slate-900 text-white px-6 py-4 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <span className="font-bold text-xl tracking-tight text-indigo-400">
            Aasa Inventory Hub
          </span>
          <div className="hidden md:flex space-x-4 text-sm font-medium text-slate-300">
            {user.role === "ADMIN" ? (
              <>
                <Link href="/admin/dashboard" className="hover:text-white px-3 py-2 rounded">
                  Admin Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link href="/dashboard" className="hover:text-white px-3 py-2 rounded">
                  Seller Dashboard
                </Link>
              </>
            )}
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
