"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import ForumCard from "@/components/forum/ForumCard";
import CreateForumModal from "@/components/forum/CreateForumModel";

export default function ForumIndexPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [forums, setForums] = useState([]);
  const [isLoadingForums, setIsLoadingForums] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      fetchForums();
    }
  }, [user]);

  async function fetchForums() {
    setIsLoadingForums(true);
    try {
      const res = await fetch("/api/forums");
      const data = await res.json();
      if (res.ok) {
        setForums(data.data); // `data` from { data: forums }
      } else {
        console.error("Failed to fetch forums:", data.error);
      }
    } catch (err) {
      console.error("Error fetching forums:", err);
    } finally {
      setIsLoadingForums(false);
    }
  }

  async function handleForumThread(title, content) {
    try {
      const res = await fetch("/api/forums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, description: content }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to create forum");
        return;
      }

      // Re-fetch forums after creation
      fetchForums();
    } catch (err) {
      console.error("Error creating forum:", err);
      alert("Failed to create forum");
    }
  }

  if (loading || isLoadingForums) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-center text-gray-500">Loading...</p>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Campus Forums</h1>
        <CreateForumModal onCreate={handleForumThread} />
      </div>

      {forums.length === 0 ? (
        <p className="text-gray-600 italic">No forums yet. Create one!</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {forums.map((forum) => (
            <ForumCard key={forum._id} forum={forum} />
          ))}
        </div>
      )}
    </main>
  );
}
