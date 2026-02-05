"use client";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
}

export function Badge({ children, variant = "default", size = "sm" }: BadgeProps) {
  const variants = {
    default: "bg-gray-100 text-black",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-black",
    danger: "bg-red-100 text-black",
    info: "bg-blue-100 text-black",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </span>
  );
}

// Priority badge
export function PriorityBadge({ priority }: { priority: string }) {
  const variants: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
    low: "default",
    medium: "info",
    high: "warning",
    critical: "danger",
  };

  return <Badge variant={variants[priority] || "default"}>{priority}</Badge>;
}

// Channel badge
export function ChannelBadge({ channel }: { channel: string }) {
  const variants: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
    "in-app": "info",
    webhook: "success",
  };

  return <Badge variant={variants[channel] || "default"}>{channel}</Badge>;
}

// Status badge
export function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
    pending: "warning",
    sent: "success",
    failed: "danger",
  };

  return <Badge variant={variants[status] || "default"}>{status}</Badge>;
}
