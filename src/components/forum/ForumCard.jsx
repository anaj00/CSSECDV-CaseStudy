"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ForumCard({ forum }) {
  return (
    <Card>
      <CardContent className="py-4 px-8 space-y-2">
        <h2 className="text-xl font-semibold">{forum.name}</h2>
        <p className="text-gray-600 text-sm">{forum.description}</p>
        <div className="flex justify-end">
          <Button variant="outline">View Threads</Button>
        </div>
      </CardContent>
    </Card>
  );
}
