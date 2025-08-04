"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EditForumModal from "@/components/forum/EditForumModal";
import { useAuth } from "@/components/providers/AuthProvider";

export default function ForumCard({ forum, user = { user } }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  const canEdit =
    user?.role === "admin" || user?.id?.toString() === forum.createdBy._id?.toString();

  function handleClick() {
    router.push(`/forums/${forum._id}`);
  }

  async function handleUpdateForum(forumId, newTitle, newDescription) {
    try {
      const res = await fetch(`/api/forums/${forumId}`, {
        method: "PUT", 
        headers: { "Content-Type": "application/json" },
        credentials: "include", 
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Update failed");
      }

      setEditOpen(false);
      // Optionally refresh forum list or show a toast
    } catch (err) {
      console.error("Update forum error:", err);
      alert(err.message || "Failed to update forum.");
    }
  }

  return (
    <>
      <Card>
        <CardContent className="py-4 px-8 space-y-2">
          <h2 className="text-xl font-semibold">{forum.title}</h2>
          <p className="text-gray-600 text-sm">{forum.description}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClick}>
              View Threads
            </Button>
            {canEdit && (
              <>
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  Edit Forum
                </Button>
                <EditForumModal
                  forum={forum}
                  open={editOpen}
                  setOpen={setEditOpen}
                  onUpdate={handleUpdateForum}
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}