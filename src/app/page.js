"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
        <div>Loading...</div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Welcome to Campus Forum</h1>
      <p className="text-gray-600 mb-8 text-center max-w-md">
        Join discussions, ask questions, and collaborate with your campus community.
      </p>
      <div className="flex gap-4">
        {user ? (
          <Button onClick={() => router.push("/forums")}>Go to Forums</Button>
        ) : (
          <>
            <Button onClick={() => router.push("/login")}>Login</Button>
            <Button variant="outline" onClick={() => router.push("/register")}>
              Register
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
