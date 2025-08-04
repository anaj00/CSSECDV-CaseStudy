"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CreateThreadModal from "@/components/thread/CreateThreadModal";
import EditThreadModal from "@/components/thread/EditThreadModal"; // New modal
import { Trash2, Pencil } from "lucide-react";

/**
 * Forum detail page that shows all threads in a forum.
 * Includes "Create Thread" modal and protected access.
 */
export default function ForumThreadsPage() {
  const router = useRouter();
  const params = useParams();
  const forumId = params.id;

  const { user, loading } = useAuth();

  const [forumTitle, setForumTitle] = useState("Forum");
  const [threads, setThreads] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [editThread, setEditThread] = useState(null);


  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Fetch forum data and threads
  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const res = await fetch(`/api/forums/${forumId}/threads`);
        const contentType = res.headers.get("content-type") || "";

        if (!res.ok || !contentType.includes("application/json")) {
          console.error(
            "Failed to load threads. Possibly a non-JSON response."
          );
          setFetching(false);
          return;
        }

        const data = await res.json();
        setThreads(data.data.threads || []);
        setForumTitle(data.data.forum?.title || "Forum");
      } catch (err) {
        console.error("Error fetching threads:", err);
      } finally {
        setFetching(false);
      }
    };

    if (user) fetchThreads();
  }, [user, forumId]);

  // Handle creation of a new thread
  async function handleCreateThread(title, content) {
    try {
      const res = await fetch(`/api/forums/${forumId}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, content }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to create thread");
        return;
      }

      // Append new thread to the list
      setThreads((prev) => [data.data, ...prev]);
    } catch (err) {
      console.error("Error creating thread:", err);
      alert("Failed to create thread");
    }
  }

  if (loading || fetching) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="text-center">Loading...</div>
      </main>
    );
  }

  if (!user) return null;


  async function handleEditThread(threadId, newTitle, newContent) {
    try {
      const res = await fetch(`/api/threads/${threadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, content: newContent }),
      });

      if (!res.ok) throw new Error("Failed to update thread");

      const updated = await res.json();
      setThreads((prev) =>
        prev.map((t) => (t._id === threadId ? updated.data : t))
      );
      setEditThread(null);
    } catch (err) {
      console.error("Edit failed:", err);
    }
  }

  async function handleDeleteThread(threadId) {
    if (!confirm("Delete this thread?")) return;
    try {
      const res = await fetch(`/api/threads/${threadId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Delete failed");
      setThreads((prev) => prev.filter((t) => t._id !== threadId));
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{forumTitle}</h1>
        <CreateThreadModal onCreate={handleCreateThread} />
      </div>

      {threads.length === 0 && (
        <p className="text-gray-600 italic">No threads yet in this forum.</p>
      )}

      {threads.map((thread) => {
        const canEdit =
          thread.createdBy?._id === user.id ||
          user.role === "admin" ||
          user.role === "moderator";


        return (
          <Card key={thread._id}>
            <CardContent className="p-4 space-y-2">
              <div>
                <h2 className="text-lg font-semibold">{thread.title}</h2>
                <p className="text-gray-600 -mt-1">{thread.content}</p>
              </div>

              <p className="text-sm text-muted-foreground">
                Posted by {thread.createdBy?.username || "Unknown"}
              </p>

              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/threads/${thread._id}`)}
                >
                  View Replies
                </Button>

                {canEdit && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setEditThread(thread)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteThread(thread._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {editThread && (
        <EditThreadModal
          thread={editThread}
          onUpdate={handleEditThread}
          onClose={() => setEditThread(null)}
        />
      )}

    </main>
  );
}
