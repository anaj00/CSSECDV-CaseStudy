"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, login, loading: authLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/forums');
    }
  }, [user, authLoading, router]);

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setValidationErrors({});

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          // Handle validation errors with specific field messages
          setValidationErrors(data.details);
          setError("Please fix the validation errors below");
        } else {
          // Handle general errors
          setError(data.error || "Registration failed");
        }
        return;
      }
      
      // Auto-login after successful registration
      if (data.user) {
        login(data.user);
        
        // Check if user needs to set up security questions
        if (data.requiresSecuritySetup) {
          // Use window.location for immediate redirect
          window.location.href = "/setup-security";
        } else {
          window.location.href = "/forums";
        }
      }
    } catch (error) {
      setError("An error occurred during registration");
    } finally {
      setLoading(false);
    }
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-50">
        <div>Loading...</div>
      </main>
    );
  }

  // Don't render register form if already authenticated
  if (user) {
    return null;
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-4">
          <h1 className="text-2xl font-bold text-center">Register</h1>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1">
              <Label>Username</Label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className={validationErrors.username ? "border-red-500" : ""}
              />
              {validationErrors.username && (
                <p className="text-red-600 text-xs">{validationErrors.username}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={validationErrors.email ? "border-red-500" : ""}
              />
              {validationErrors.email && (
                <p className="text-red-600 text-xs">{validationErrors.email}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={validationErrors.password ? "border-red-500" : ""}
              />
              {validationErrors.password && (
                <p className="text-red-600 text-xs">{validationErrors.password}</p>
              )}
              <p className="text-gray-500 text-xs">
                Password must be at least 12 characters long and contain at least one lowercase letter, one uppercase letter, and one digit.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
