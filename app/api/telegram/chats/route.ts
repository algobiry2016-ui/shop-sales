import { NextResponse } from "next/server";
import { recentTelegramChats } from "@/lib/notify";
import { getProfile } from "@/lib/supabase/server";

// Managers open this once after adding the bot to their Telegram group, to read the
// group's chat id for TELEGRAM_CHAT_ID.
export async function GET() {
  const profile = await getProfile();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!process.env.TELEGRAM_BOT_TOKEN) return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN is not set in Vercel" }, { status: 400 });

  const chats = await recentTelegramChats();
  return NextResponse.json({
    hint: chats.length ? "Copy the id of your group into TELEGRAM_CHAT_ID" : "No chats yet: add the bot to your group and send a message there, then reload",
    chats,
  });
}
