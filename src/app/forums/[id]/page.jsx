import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Dummy thread data
const dummyThreads = [
  {
    id: 1,
    title: "Welcome to the forum!",
    content: "This is the first thread. Feel free to reply.",
    author: "admin",
  },
  {
    id: 2,
    title: "Introduce yourself",
    content: "Let's get to know each other.",
    author: "moderator1",
  },
];

export default function ForumThreadsPage({ params }) {
  const forumId = params.id;

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Threads in Forum {forumId}</h1>

      {dummyThreads.map((thread) => (
        <Card key={thread.id}>
          <CardContent className="p-4 space-y-2">
            <h2 className="text-lg font-semibold">{thread.title}</h2>
            <p className="text-gray-600">{thread.content}</p>
            <p className="text-sm text-muted-foreground">
              Posted by {thread.author}
            </p>
            <div className="flex justify-end">
              <Button size="sm" variant="outline">
                View Replies
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </main>
  );
}
