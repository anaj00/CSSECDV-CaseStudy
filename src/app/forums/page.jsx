"use client";

import ForumCard from "@/components/forum/ForumCard";
import CreateThreadModal from "@/components/forum/CreateThreadModel";

const dummyForums = [
  { id: 1, name: "Announcements", description: "Official news and updates." },
  { id: 2, name: "Q&A", description: "Ask questions and get help." },
  { id: 3, name: "General Discussion", description: "Talk about anything." },
];

export default function ForumIndexPage() {
  function handleCreateThread(title, content) {
    console.log("Creating thread:", title, content);
    // Post to API here later
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Campus Forums</h1>
        <CreateThreadModal onCreate={handleCreateThread} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {dummyForums.map((forum) => (
          <ForumCard key={forum.id} forum={forum} />
        ))}
      </div>
    </main>
  );
}
