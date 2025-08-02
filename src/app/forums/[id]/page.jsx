"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Dummy threads with forumId
const dummyThreads = [
  {
    id: 1,
    forumId: 1,
    title: "Welcome to the forum!",
    content: "This is the first thread. Feel free to reply.",
    author: "admin",
  },
  {
    id: 2,
    forumId: 2,
    title: "Introduce yourself",
    content: "Let's get to know each other.",
    author: "moderator1",
  },
  {
    id: 3,
    forumId: 1,
    title: "Event this Friday",
    content: "Join us for the campus welcome event!",
    author: "staff",
  },
];

export default function ForumThreadsPage({ params }) {
  const forumId = params.id;
  const router = useRouter();

  // ✅ Put it here
  const forumThreads = dummyThreads.filter(
    (thread) => thread.forumId.toString() === forumId
  );

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Threads in Forum {forumId}</h1>

      {forumThreads.length === 0 && (
        <p className="text-gray-600 italic">No threads yet in this forum.</p>
      )}

      {forumThreads.map((thread) => (
        <Card key={thread.id}>
          <CardContent className="p-4 space-y-2">
            <h2 className="text-lg font-semibold">{thread.title}</h2>
            <p className="text-gray-600">{thread.content}</p>
            <p className="text-sm text-muted-foreground">
              Posted by {thread.author}
            </p>
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/threads/${thread.id}`)}
              >
                View Replies
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </main>
  );
}
