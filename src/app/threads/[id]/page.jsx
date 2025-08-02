import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Dummy thread data
const dummyThread = {
  id: 1,
  title: "Welcome to the forum!",
  content: "Feel free to ask questions or introduce yourself below.",
  author: "admin",
};

// Dummy replies
const dummyReplies = [
  { id: 1, author: "student1", content: "Hi everyone!" },
  { id: 2, author: "student2", content: "Looking forward to the discussions." },
];

export default function ThreadDetailPage({ params }) {
  const threadId = params.id;

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <Card>
        <CardContent className="p-6 space-y-2">
          <h1 className="text-2xl font-bold">{dummyThread.title}</h1>
          <p className="text-gray-700">{dummyThread.content}</p>
          <p className="text-sm text-muted-foreground">
            Posted by {dummyThread.author}
          </p>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Replies</h2>

        {dummyReplies.map((reply) => (
          <Card key={reply.id}>
            <CardContent className="p-4 space-y-1">
              <p>{reply.content}</p>
              <p className="text-sm text-muted-foreground">by {reply.author}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Leave a Reply</h3>
        <form className="space-y-4">
          <div>
            <Label htmlFor="reply">Reply</Label>
            <Textarea id="reply" rows={4} placeholder="Write your comment..." />
          </div>
          <Button type="submit">Post Reply</Button>
        </form>
      </section>
    </main>
  );
}
