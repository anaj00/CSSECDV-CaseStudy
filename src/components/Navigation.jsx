"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";

export default function Navigation() {
  const router = useRouter();
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
        <Button
          variant="link"
          onClick={() => router.push("/")}
          className="text-blue-600 p-0"
        >
          Home
        </Button>

        {user && (
          <Button
            variant="link"
            onClick={() => router.push("/forums")}
            className="p-0"
          >
            Forums
          </Button>
        )}

        {user?.role === "admin" && (
          <Button
            variant="link"
            onClick={() => router.push("/admin")}
            className="p-0"
          >
            Admin
          </Button>
        )}

        {user?.role === "moderator" && (
          <Button
            variant="link"
            onClick={() => router.push("/moderator")}
            className="p-0"
          >
            Moderator
          </Button>
        )}
      </div>

      <div className="flex gap-4 items-center">
        {user ? (
          <>
            <span className="text-gray-600">Welcome, {user.username}</span>
            <Button
              onClick={logout}
              disabled={loggingOut}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => router.push("/login")}>Login</Button>
            <Button variant="outline" onClick={() => router.push("/register")}>
              Register
            </Button>
          </>
        )}
      </div>
    </nav>
  );
}
