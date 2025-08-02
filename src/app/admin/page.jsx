"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Dummy user list
const users = [
  { id: 1, username: "admin", email: "admin@example.com", role: "admin" },
  { id: 2, username: "mod1", email: "mod@example.com", role: "moderator" },
  { id: 3, username: "user1", email: "user1@example.com", role: "user" },
];

// Dummy forums
const forums = [
  { id: 1, name: "Announcements" },
  { id: 2, name: "Q&A" },
  { id: 3, name: "General Discussion" },
];

// Dummy threads
const threads = [
  { id: 1, title: "Welcome thread", forumId: 1 },
  { id: 2, title: "Introduce Yourself", forumId: 2 },
];

export default function AdminDashboard() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      {/* Users */}
      <section>
        <h2 className="text-xl font-semibold mb-4">User Management</h2>
        <div className="space-y-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{user.username}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-sm">Role: {user.role}</p>
                </div>
                <div className="flex gap-2">
                  {user.role !== "admin" && (
                    <Button variant="outline" size="sm">
                      {user.role === "moderator" ? "Demote" : "Promote to Mod"}
                    </Button>
                  )}
                  <Button variant="destructive" size="sm">
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
            <Card key={forum.id}>
              <CardContent className="p-4 flex justify-between items-center">
                <p className="font-medium">{forum.name}</p>
                <Button variant="destructive" size="sm">
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
        <h2 className="text-xl font-semibold mb-4">Threads</h2>
        <div className="space-y-4">
          {threads.map((thread) => (
            <Card key={thread.id}>
              <CardContent className="p-4 flex justify-between items-center">
                <p className="font-medium">{thread.title}</p>
                <Button variant="destructive" size="sm">
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
