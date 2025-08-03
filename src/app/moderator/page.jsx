"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function ModeratorDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [forums, setForums] = useState([]);
  const [threads, setThreads] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const router = useRouter();

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

  async function handleDeleteThread(threadId) {
    if (!confirm('Are you sure you want to delete this thread?')) return;

    try {
      const res = await fetch(`/api/threads/${threadId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: threadId }),
      });

      if (!res.ok) throw new Error('Failed to delete thread');

      setThreads(prev => prev.filter(t => t._id !== threadId));
    } catch (err) {
      console.error('Delete thread error:', err);
      alert('Error deleting thread');
    }
  }

  useEffect(() => {
    if (!authLoading) {
      if (!user) router.push("/login");
      else if (user.role !== "moderator") router.push("/forums");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || user.role !== "moderator") return;

    async function fetchData() {
      try {
        const [forumRes, threadRes, userRes] = await Promise.all([
          fetch("/api/forums"),
          fetch("/api/threads"),
          fetch("/api/users"),
        ]);

        const forumJson = await forumRes.json();
        const threadJson = await threadRes.json();
        const userJson = await userRes.json();

        setForums(forumJson?.data || []);
        setThreads(threadJson?.data || []);
        setUsers(userJson?.users || []);
      } catch (err) {
        console.error("Failed to load moderator data:", err);
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, [user]);

  async function handleLockThread(threadId, locked) {
    await fetch(`/api/threads/${threadId}/lock`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked: !locked }),
    });
    setThreads((t) =>
      t.map((th) => (th._id === threadId ? { ...th, locked: !locked } : th))
    );
  }

  async function handleDeleteThread(threadId) {
    if (!confirm("Are you sure you want to delete this thread?")) return;
    await fetch(`/api/threads/${threadId}`, { method: "DELETE" });
    setThreads((t) => t.filter((th) => th._id !== threadId));
  }

  async function handlePromoteUser(userId, currentRole) {
    const newRole = currentRole === "moderator" ? "user" : "moderator";
    const confirmMsg =
      newRole === "moderator"
        ? "Promote this user to moderator?"
        : "Demote this moderator to user?";
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newRole }),
      });

      if (!res.ok) throw new Error("Failed to update role");

      const data = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: data.user.role } : u))
      );
    } catch (err) {
      console.error(err);
      alert("Error updating user role");
    }
  }

  if (authLoading || loadingData)
    return <p className="text-center py-10">Loading...</p>;

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      <h1 className="text-3xl font-bold">Moderator Dashboard</h1>

      {/* Forums */}
      <section>
        <h2 className="text-xl font-semibold mb-4">All Forums</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {forums.map((forum) => (
            <Card key={forum._id}>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                <p className="font-medium">{forum.title}</p>
                </div>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteForum(forum._id)}>
                    Delete
                  </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* Threads */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Manage Threads</h2>
        <div className="space-y-4">
          {threads.map((thread) => (
            <Card key={thread._id}>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{thread.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Locked: {thread.locked ? "Yes" : "No"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLockThread(thread._id, thread.locked)}
                  >
                    {thread.locked ? "Unlock" : "Lock"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteThread(thread._id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* Promote Users */}
      <section>
        <h2 className="text-xl font-semibold mb-4">User Management</h2>
        <div className="space-y-4">
          {users
            .filter((u) => u.role !== "admin")
            .map((u) => (
              <Card key={u._id}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{u.username}</p>
                    <p className="text-sm text-muted-foreground">
                      Role: {u.role}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePromoteUser(u._id, u.role)}
                  >
                    {u.role === "moderator" ? "Demote" : "Promote to Mod"}
                  </Button>
                </CardContent>
              </Card>
            ))}
        </div>
      </section>
    </main>
  );
}
