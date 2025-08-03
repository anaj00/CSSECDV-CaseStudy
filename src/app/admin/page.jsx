"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";



export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [forums, setForums] = useState([]);
  const [threads, setThreads] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  async function handleRoleChange(userId, currentRole) {
    const newRole = currentRole === 'moderator' ? 'user' : 'moderator';

    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newRole }),
      });

      if (!res.ok) throw new Error('Failed to update role');

      const data = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: data.user.role} : u))
      );
    } catch (err) {
      console.error(err);
      alert('Error updating user role');
    }
  }

  async function handleDeleteUser(userId) {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete user');

      // Update UI
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete user");
    }
  }

  async function handleDeleteForum(forumId) {
    if (!confirm('Are you sure you want to delete this forum?')) return;

    try {
      const res = await fetch(`/api/forums/${forumId}`, { method: 'DELETE' });

      if (!res.ok) throw new Error('Failed to delete forum');

      setForums(prev => prev.filter(f => f._id !== forumId));
    } catch (err) {
      console.error('Delete forum error:', err);
      alert('Error deleting forum');
    }
  }



  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) router.push('/login');
      else if (user.role !== 'admin') router.push('/forums');
    }
  }, [user, authLoading, router]);

  // Fetch all admin dashboard data
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    async function fetchData() {
      try {
        const [forumRes, threadRes, userRes] = await Promise.all([
          fetch('/api/forums'),
          fetch('/api/threads'),
          fetch('/api/users'),
        ]);

        const forumJson = await forumRes.json();
        const threadJson = await threadRes.json();
        const userJson = await userRes.json();

        setForums(forumJson?.data || []);
        setThreads(threadJson?.data || []);
        setUsers(userJson?.users || []); // FIXED: access `users` array
      } catch (err) {
        console.error("Failed to load admin data:", err);
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, [user]);

  if (authLoading || loadingData) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="text-center">Loading...</div>
      </main>
    );
  }

  if (!user || user.role !== 'admin') return null;

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      {/* Users */}
      <section>
        <h2 className="text-xl font-semibold mb-4">User Management</h2>
        <div className="space-y-4">
          {users.map((u) => (
            <Card key={u._id}>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{u.username}</p>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                  <p className="text-sm">Role: {u.role}</p>
                </div>
                <div className="flex gap-2">
                  {u.role !== "admin" && (
                    <Button variant="outline" size="sm" onClick={() => handleRoleChange(u._id, u.role)}>
                      {u.role === "moderator" ? "Demote" : "Promote to Mod"}
                    </Button>
                  )}
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(u._id)}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* Forums */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Forum Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {forums.map((forum) => (
            <Card key={forum._id}>
              <CardContent className="p-4 flex justify-between items-center">
                <p className="font-medium">{forum.title}</p>
                <Button variant="destructive" size="sm" onClick={() => handleDeleteForum(forum._id)}>Delete</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* Threads */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Threads</h2>
        <div className="space-y-4">
          {threads.map((thread) => (
            <Card key={thread._id}>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{thread.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {thread?.createdBy?.username || "Unknown"}
                  </p>
                </div>
                <Button variant="destructive" size="sm">Delete</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}

