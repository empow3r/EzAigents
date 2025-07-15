
"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import { Label } from "@/src/components/ui/label";

export default function SchedulingPage() {
  const [postContent, setPostContent] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");

  const handleSchedule = async () => {
    const response = await fetch("/api/scheduling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: postContent, scheduleDate }),
    });

    if (response.ok) {
      alert("Post scheduled successfully!");
      setPostContent("");
      setScheduleDate("");
    } else {
      alert("Failed to schedule post.");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Schedule a New Post</h1>
      <div className="space-y-4">
        <div>
          <Label htmlFor="post-content">Content</Label>
          <Textarea
            id="post-content"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="What do you want to post?"
            rows={6}
          />
        </div>
        <div>
          <Label htmlFor="schedule-date">Schedule Date and Time</Label>
          <Input
            id="schedule-date"
            type="datetime-local"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
          />
        </div>
        <Button onClick={handleSchedule}>Schedule Post</Button>
      </div>
    </div>
  );
}
