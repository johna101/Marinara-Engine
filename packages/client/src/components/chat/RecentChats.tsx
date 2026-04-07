// ──────────────────────────────────────────────
// Chat: Recent Chats — shows 3 most recently
// interacted chats on the homepage
// ──────────────────────────────────────────────
import { useMemo } from "react";
import { MessageSquare, BookOpen } from "lucide-react";
import { useChats } from "../../hooks/use-chats";
import { useCharacters } from "../../hooks/use-characters";
import { useChatStore } from "../../stores/chat.store";
import { cn } from "../../lib/utils";
import type { Chat } from "@marinara-engine/shared";

const MODE_BADGE: Record<string, { icon: React.ReactNode; bg: string; label: string }> = {
  conversation: {
    icon: <MessageSquare size="0.5rem" />,
    bg: "linear-gradient(135deg, #4de5dd, #3ab8b1)",
    label: "Conversation",
  },
  roleplay: {
    icon: <BookOpen size="0.5rem" />,
    bg: "linear-gradient(135deg, #eb8951, #d97530)",
    label: "Roleplay",
  },
  visual_novel: {
    icon: <BookOpen size="0.5rem" />,
    bg: "linear-gradient(135deg, #e15c8c, #c94776)",
    label: "Game",
  },
};

export function RecentChats() {
  const { data: chats } = useChats();
  const { data: allCharacters } = useCharacters();
  const setActiveChatId = useChatStore((s) => s.setActiveChatId);

  // Build character lookup: id → { name, avatarUrl }
  const charLookup = useMemo(() => {
    const map = new Map<string, { name: string; avatarUrl: string | null }>();
    if (!allCharacters) return map;
    for (const char of allCharacters as Array<{ id: string; data: string; avatarPath: string | null }>) {
      try {
        const parsed = typeof char.data === "string" ? JSON.parse(char.data) : char.data;
        map.set(char.id, {
          name: parsed.name ?? "Unknown",
          avatarUrl: char.avatarPath ?? null,
        });
      } catch {
        map.set(char.id, { name: "Unknown", avatarUrl: null });
      }
    }
    return map;
  }, [allCharacters]);

  // Get 3 most recently updated chats
  const recentChats = useMemo(() => {
    if (!chats || chats.length === 0) return [];
    return [...chats]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
  }, [chats]);

  if (recentChats.length === 0) return null;

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-2">
      <p className="text-xs font-medium text-[var(--muted-foreground)]/60 tracking-wide uppercase">
        Recent Chats
      </p>
      <div className="flex w-full flex-col gap-1.5">
        {recentChats.map((chat) => (
          <RecentChatRow
            key={chat.id}
            chat={chat}
            charLookup={charLookup}
            onClick={() => setActiveChatId(chat.id)}
          />
        ))}
      </div>
    </div>
  );
}

function RecentChatRow({
  chat,
  charLookup,
  onClick,
}: {
  chat: Chat;
  charLookup: Map<string, { name: string; avatarUrl: string | null }>;
  onClick: () => void;
}) {
  const mode = MODE_BADGE[chat.mode] ?? MODE_BADGE.conversation;

  // Parse character IDs
  const charIds: string[] = useMemo(() => {
    if (!chat.characterIds) return [];
    return typeof chat.characterIds === "string" ? JSON.parse(chat.characterIds) : chat.characterIds;
  }, [chat.characterIds]);

  const avatars = useMemo(
    () =>
      charIds
        .slice(0, 3)
        .map((id) => charLookup.get(id))
        .filter(Boolean) as { name: string; avatarUrl: string | null }[],
    [charIds, charLookup],
  );

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-xl border border-[var(--border)]/60 bg-[var(--card)]/60 px-3 py-2.5",
        "transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--primary)]/40 hover:bg-[var(--card)] hover:shadow-md",
        "cursor-pointer text-left",
      )}
    >
      {/* Avatar area with mode badge */}
      <div className="relative flex-shrink-0">
        {avatars.length === 0 ? (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-sm"
            style={{ background: mode.bg }}
          >
            {mode.icon}
          </div>
        ) : avatars.length === 1 ? (
          avatars[0]!.avatarUrl ? (
            <img
              src={avatars[0]!.avatarUrl}
              alt={avatars[0]!.name}
              className="h-9 w-9 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--secondary)] text-sm font-bold text-[var(--muted-foreground)]">
              {avatars[0]!.name[0]}
            </div>
          )
        ) : (
          <div className="relative h-9 w-9">
            {avatars.slice(0, 2).map((a, i) =>
              a.avatarUrl ? (
                <img
                  key={i}
                  src={a.avatarUrl}
                  alt={a.name}
                  className={cn(
                    "absolute h-6 w-6 rounded-full object-cover ring-2 ring-[var(--card)]",
                    i === 0 ? "top-0 left-0 z-10" : "bottom-0 right-0",
                  )}
                />
              ) : (
                <div
                  key={i}
                  className={cn(
                    "absolute flex h-6 w-6 items-center justify-center rounded-full bg-[var(--secondary)] text-[0.5rem] font-bold text-[var(--muted-foreground)] ring-2 ring-[var(--card)]",
                    i === 0 ? "top-0 left-0 z-10" : "bottom-0 right-0",
                  )}
                >
                  {a.name[0]}
                </div>
              ),
            )}
          </div>
        )}

        {/* Mode badge - top left corner */}
        <div
          className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full text-white shadow-sm ring-2 ring-[var(--card)]/80"
          style={{ background: mode.bg }}
          title={mode.label}
        >
          {mode.icon}
        </div>
      </div>

      {/* Chat info */}
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[var(--foreground)]">
          {chat.name}
        </span>
        <span className="block truncate text-[0.625rem] text-[var(--muted-foreground)]/60">
          {avatars.length > 0
            ? avatars.map((a) => a.name).join(", ")
            : mode.label}
        </span>
      </div>

      {/* Arrow indicator on hover */}
      <span className="shrink-0 text-[var(--muted-foreground)]/40 transition-all group-hover:text-[var(--primary)] group-hover:translate-x-0.5">
        →
      </span>
    </button>
  );
}
