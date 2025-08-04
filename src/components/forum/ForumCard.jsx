"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EditForumModal from "@/components/forum/EditForumModal";
import DeleteForumModal from "@/components/forum/DeleteForumModal";
import { useAuth } from "@/components/providers/AuthProvider";
import { Trash2, Pencil } from "lucide-react";

export default function ForumCard({ forum, onForumDeleted }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { user } = useAuth();

  const canEditOrDelete =
    user?.role === "admin" ||
    user?.role === "moderator" ||
    user?.id?.toString() === forum.createdBy._id?.toString();

  function handleClick() {
    router.push(`/forums/${forum._id}`);
  }

  async function handleUpdateForum(forumId, newTitle, newDescription) {
    const res = await fetch(`/api/forums/${forumId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: newTitle, description: newDescription }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Update failed");
  }

  async function handleDeleteForum(forumId) {
    const res = await fetch(`/api/forums/${forumId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Delete failed");

    if (onForumDeleted) onForumDeleted(forumId);
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
            {canEditOrDelete && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <EditForumModal
        forum={forum}
        open={editOpen}
        setOpen={setEditOpen}
        onUpdate={handleUpdateForum}
      />
      <DeleteForumModal
        forum={forum}
        open={deleteOpen}
        setOpen={setDeleteOpen}
        onDelete={handleDeleteForum}
      />
    </>
  );
}
