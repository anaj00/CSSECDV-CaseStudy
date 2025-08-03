'use client';

import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";

export default function Navigation() {
  const { user, loading, loggingOut, logout } = useAuth();

  if (loading) {
    return (
      <nav className="p-4 bg-white shadow flex gap-4">
        <span>Loading...</span>
      </nav>
    );
  }

  return (
    <nav className="p-4 bg-white shadow flex gap-4 items-center justify-between">
      <div className="flex gap-4">
        <Link href="/" className="font-bold text-blue-600">Home</Link>
        {user && <Link href="/forums">Forums</Link>}
        {user?.role === 'admin' && <Link href="/admin">Admin</Link>}
      </div>
      <div className="flex gap-4 items-center">
        {user ? (
          <>
            <span className="text-gray-600">Welcome, {user.username}</span>
            <button 
              onClick={logout}
              disabled={loggingOut}
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
