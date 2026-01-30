"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { createInstance } from "@/app/actions";
import { useRouter } from "next/navigation";

export default function StartChecklistButton({
  templateId,
  templateTitle,
}: {
  templateId: string;
  templateTitle: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStart = async () => {
    setLoading(true);
    // Create with default title
    const result = await createInstance({
      templateId,
      title: `${templateTitle} - ${new Date().toLocaleDateString()}`,
    });

    if (result.success && result.data) {
      router.push(`/instances/${result.data.id}`);
    } else {
      setLoading(false);
      alert("Failed to create checklist");
    }
  };

  return (
    <Button
      onClick={handleStart}
      disabled={loading}
      size="sm"
      variant="default"
      className="bg-blue-600 hover:bg-blue-700"
    >
      {loading ? (
        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
      ) : (
        <Play className="mr-2 h-3 w-3" />
      )}
      Start
    </Button>
  );
}
