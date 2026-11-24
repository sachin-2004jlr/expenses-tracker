import { cn } from "@/lib/utils";

export interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function initials(name?: string | null, email?: string | null): string {
  const source = (name ?? "").trim() || (email ?? "").split("@")[0] || "";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length >= 2 ? `${parts[0]![0]}${parts[1]![0]}` : source.slice(0, 2);
  return letters.toUpperCase() || "?";
}

/** Avatar image when available, initials otherwise. Plain <img> avoids next/image domain config. */
export function UserAvatar({ name, email, image, size = "md", className }: UserAvatarProps) {
  const box = size === "sm" ? "size-7 text-xs" : size === "lg" ? "size-12 text-base" : "size-8 text-xs";
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name ?? email ?? "User avatar"}
        referrerPolicy="no-referrer"
        className={cn("shrink-0 rounded-full object-cover ring-1 ring-border", box, className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center rounded-full bg-mist font-semibold text-ink dark:bg-muted dark:text-foreground", box, className)}
    >
      {initials(name, email)}
    </span>
  );
}
