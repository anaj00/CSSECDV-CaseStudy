"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";


export default function ThreadDetailPage() {
  const { id: threadId } = useParams();

  const [thread, setThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const threadRes = await fetch(`/api/threads/${threadId}`);
      const threadJson = await threadRes.json();
      if (threadJson.success) setThread(threadJson.data.thread);

      const replyRes = await fetch(`/api/replies?threadId=${threadId}`);
      const replyJson = await replyRes.json();
      if (replyJson.success) setReplies(replyJson.data);

      setLoading(false);
    }

    if (threadId) fetchData();
  }, [threadId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!replyText.trim()) return;

    const res = await fetch(`/api/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content: replyText, threadId }),
    });

    const json = await res.json();
    if (json.success) {
      setReplies((prev) => [...prev, json.data]);
      setReplyText("");
    }
  }

  if (loading)
    return <p className="text-center py-10 text-muted">Loading thread...</p>;

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Thread */}
      <div className="space-y-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{thread?.title}</h1>
          <p className="text-base text-gray-800">{thread?.content}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Posted by{" "}
          <span className="font-medium">
            {thread?.createdBy?.username || "Unknown"}
          </span>
        </p>
      </div>

      <Separator />

      {/* Replies */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Replies</h2>

        {replies.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No replies yet. Be the first to respond!
          </p>
        ) : (
          replies.map((reply) => (
            <Card key={reply._id} className="border-gray-200">
              <CardContent className="p-4">
                <p className="text-gray-800">{reply.content}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  by{" "}
                  <span className="font-medium">
                    {reply.createdBy?.username || "Unknown"}
                  </span>
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <Separator />

      {/* Reply Form */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold">Leave a Reply</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reply">Your Comment</Label>
            <Textarea
              id="reply"
              rows={4}
              className="resize-none"
              placeholder="Write your comment..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" className="ml-auto">
              Post Reply
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
