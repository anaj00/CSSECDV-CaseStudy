"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import ForumCard from "@/components/forum/ForumCard";
import CreateThreadModal from "@/components/forum/CreateThreadModel";

const dummyForums = [
  { id: 1, name: "Announcements", description: "Official news and updates." },
  { id: 2, name: "Q&A", description: "Ask questions and get help." },
  { id: 3, name: "General Discussion", description: "Talk about anything." },
];

/**
 * Forum index page component that displays a list of available forums.
 * Requires user authentication - redirects to login if not authenticated.
 * Shows a loading state while authentication status is being determined.
 * 
 * @returns {JSX.Element} The forum index page with forum cards and create thread modal
 */
export default function ForumIndexPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  /**
   * Handles the creation of a new thread with the provided title and content.
   * Currently logs the thread data to console for development purposes.
   * 
   * @param {string} title - The title of the new thread
   * @param {string} content - The content/body of the new thread
   */
  function handleCreateThread(title, content) {
    console.log("Creating thread:", title, content);
  }
  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="text-center">Loading...</div>
      </main>
    );
  }

  if (!user) {
    return null;
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
