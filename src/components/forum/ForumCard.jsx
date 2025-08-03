"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ForumCard({ forum }) {
  const router = useRouter();

  function handleClick() {
    router.push(`/forums/${forum._id}`); // ✅ use _id instead of id
  }

  return (
    <Card>
      <CardContent className="py-4 px-8 space-y-2">
        <h2 className="text-xl font-semibold">{forum.title}</h2>{" "}
        <p className="text-gray-600 text-sm">{forum.description}</p>
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleClick}>
            View Threads
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
