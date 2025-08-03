"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="text-gray-600 text-sm">Loading your experience...</div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 text-center">
      <h1 className="text-4xl font-semibold mb-4">Welcome to Campus Forum</h1>
      <p className="text-gray-600 mb-8 max-w-md">
        Join discussions, ask questions, and collaborate with your campus
        community.
      </p>

      <div className="flex flex-wrap justify-center gap-4">
        {user ? (
          <Button onClick={() => router.push("/forums")}>Go to Forums</Button>
        ) : (
          <>
            <Button
              className="hover:cursor-pointer"
              onClick={() => router.push("/login")}
            >
              Login
            </Button>
            <Button
              className="hover:cursor-pointer"
              variant="outline"
              onClick={() => router.push("/register")}
            >
              Register
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
