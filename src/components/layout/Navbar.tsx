"use client";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

export function Navbar() {
  const { user } = useAuth();
  const { logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CR</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Crossroads</span>
            <span className="text-xs text-gray-500 hidden sm:inline">IELTS Simulator</span>
          </Link>

          {user ? (
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-4">
                <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
                <Link href="/tests" className="text-sm text-gray-600 hover:text-gray-900">Tests</Link>
                <Link href="/history" className="text-sm text-gray-600 hover:text-gray-900">History</Link>
                {(user.role === "admin" || user.role === "super_admin") && (
                  <Link href="/admin/tests" className="text-sm text-blue-600 hover:text-blue-800">Admin</Link>
                )}
                {(user.role === "evaluator" || user.role === "admin" || user.role === "super_admin") && (
                  <Link href="/evaluator/submissions" className="text-sm text-purple-600 hover:text-purple-800">Evaluate</Link>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center space-x-2 text-sm"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium">{user.name[0].toUpperCase()}</span>
                  </div>
                  <span className="hidden md:inline text-gray-700">{user.name}</span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-1">
                    <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>Profile</Link>
                    <div className="md:hidden border-t my-1">
                      <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                      <Link href="/tests" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>Tests</Link>
                      <Link href="/history" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>History</Link>
                    </div>
                    <button
                      onClick={() => { logout(); setMenuOpen(false); window.location.href = "/"; }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
