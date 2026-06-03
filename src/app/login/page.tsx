"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = async (e?: React.FormEvent, customEmail?: string, customPassword?: string) => {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);

    const loginEmail = customEmail || email;
    const loginPassword = customPassword || password;

    if (!loginEmail || !loginPassword) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: loginEmail,
        password: loginPassword,
      });

      if (res?.error) {
        setError(res.error || "Invalid credentials");
        setLoading(false);
      } else {
        // Fetch session to determine role and redirect
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        
        if (session?.user?.role === "ADMIN") {
          router.push("/admin/dashboard");
        } else {
          router.push("/dashboard");
        }
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleQuickFill = (accEmail: string, accPass: string) => {
    setEmail(accEmail);
    setPassword(accPass);
    setShowModal(false);
    handleSubmit(undefined, accEmail, accPass);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard: " + text);
  };

  const demoAccounts = [
    {
      role: "Admin",
      email: "admin@assa.com",
      password: "Admin@123",
      description: "Oversees catalog, stock adjustments, quotations, orders, and audits.",
    },
    {
      role: "Seller",
      email: "seller@assa.com",
      password: "Seller@123",
      description: "Searches catalog, builds carts, requests quotes, and views status.",
    },
    {
      role: "Buyer",
      email: "buyer@assa.com",
      password: "Buyer@123",
      description: "Reviews approved quotations, places orders, and views order history.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-50 text-zinc-950 font-sans">
      
      {/* Left side: Branding & Minimalist Industrial Panel */}
      <div className="hidden md:flex md:w-1/2 bg-zinc-950 text-zinc-100 p-12 flex-col justify-between border-r border-zinc-900">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-lg font-bold tracking-widest text-zinc-100 border border-zinc-800 px-2.5 py-1">
              AASA
            </span>
            <span className="font-mono text-sm text-zinc-500 font-bold uppercase tracking-wider">
              Inventory Hub
            </span>
          </div>
        </div>

        <div className="space-y-8 my-auto">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight font-mono">
              PHARMACEUTICAL INVENTORY OPERATIONS
            </h1>
            <p className="text-zinc-400 text-sm max-w-md">
              Secure, high-precision supply chain manager for active pharmaceutical ingredients (APIs), packaging, and sterile clinical stock.
            </p>
          </div>

          {/* Minimal Industrial Stock Grid Illustration */}
          <div className="border border-zinc-800 p-6 bg-zinc-900/30 font-mono text-[10px] space-y-4">
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-500">CANONICAL UNIT DATABASE</span>
              <span className="text-emerald-500">ONLINE</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="border border-zinc-800 p-2.5 space-y-1">
                <p className="text-zinc-500">API WEIGHT</p>
                <p className="text-[12px] font-bold text-zinc-200">1,500,000 g</p>
                <span className="inline-block w-full h-1 bg-emerald-500"></span>
              </div>
              <div className="border border-zinc-800 p-2.5 space-y-1">
                <p className="text-zinc-500">LIQUID VOL</p>
                <p className="text-[12px] font-bold text-zinc-200">3,000,000 mL</p>
                <span className="inline-block w-full h-1 bg-amber-500"></span>
              </div>
              <div className="border border-zinc-800 p-2.5 space-y-1">
                <p className="text-zinc-500">CLINICAL COUNT</p>
                <p className="text-[12px] font-bold text-zinc-200">7,000 items</p>
                <span className="inline-block w-full h-1 bg-zinc-600"></span>
              </div>
            </div>
            <div className="text-[9px] text-zinc-500 leading-relaxed">
              * Atomic stock deductions verify stock level limits before quotation conversion to prevent deficits.
            </div>
          </div>

          {/* Features Highlights */}
          <ul className="space-y-3 text-xs text-zinc-400">
            <li className="flex items-center space-x-2.5">
              <span className="w-1.5 h-1.5 bg-zinc-700"></span>
              <span>Decimal-accurate unit conversions (g/kg, mL/L, items)</span>
            </li>
            <li className="flex items-center space-x-2.5">
              <span className="w-1.5 h-1.5 bg-zinc-700"></span>
              <span>Regulatory compliance stock ledger & audit logging</span>
            </li>
            <li className="flex items-center space-x-2.5">
              <span className="w-1.5 h-1.5 bg-zinc-700"></span>
              <span>Quotation requests and buyer purchasing workflow</span>
            </li>
          </ul>
        </div>

        <div className="text-xs text-zinc-600 font-mono">
          © 2026 AASA INVENTORY OPERATIONS v1.2.0
        </div>
      </div>

      {/* Right side: Center-aligned bordered Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-sm border border-zinc-200 bg-white p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight font-mono">
              USER AUTHENTICATION
            </h2>
            <p className="text-xs text-zinc-500">
              Enter your credentials to access the hub workspace.
            </p>
          </div>

          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 font-mono">
              [ERROR] {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="email-address" className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className="w-full px-3 py-2 border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 placeholder-zinc-400 font-mono"
                placeholder="email@assa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-3 py-2 border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 placeholder-zinc-450 font-mono"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-zinc-950 hover:bg-zinc-900 text-white text-xs font-semibold tracking-wider uppercase border border-zinc-900 transition-colors disabled:opacity-50 font-mono"
            >
              {loading ? "Authenticating..." : "Sign In"}
            </button>
          </form>

          <div className="border-t border-zinc-150 pt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="px-4 py-1.5 text-xs border border-zinc-200 hover:bg-zinc-50 font-mono text-zinc-650 transition-colors"
            >
              Demo Credentials
            </button>
          </div>
        </div>
      </div>

      {/* Demo Credentials Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-300 max-w-lg w-full p-6 space-y-4 font-sans shadow-lg">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold font-mono text-sm tracking-wider uppercase">DEMO ACCOUNTS</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-zinc-700 text-xs font-mono"
              >
                [CLOSE]
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {demoAccounts.map((account) => (
                <div key={account.role} className="border border-zinc-100 p-3 space-y-2 bg-zinc-50">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold uppercase tracking-wider text-indigo-750 bg-indigo-50 px-2 py-0.5 border border-indigo-150">
                      {account.role}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">{account.description}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5 font-mono">
                    <div className="flex items-center justify-between border border-zinc-200 bg-white p-2">
                      <span className="text-[11px] truncate">{account.email}</span>
                      <button
                        onClick={() => copyToClipboard(account.email)}
                        className="text-[10px] text-zinc-500 hover:text-zinc-900 border border-zinc-200 px-1.5 py-0.5"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="flex items-center justify-between border border-zinc-200 bg-white p-2">
                      <span className="text-[11px] truncate">{account.password}</span>
                      <button
                        onClick={() => copyToClipboard(account.password)}
                        className="text-[10px] text-zinc-500 hover:text-zinc-900 border border-zinc-200 px-1.5 py-0.5"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={() => handleQuickFill(account.email, account.password)}
                      className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-mono text-[10px] font-bold uppercase border border-zinc-950 transition-colors"
                    >
                      Quick Fill & Sign In
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
