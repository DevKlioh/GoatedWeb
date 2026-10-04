import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function MyProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const username = profile?.username?.trim();

  // If an older OAuth account has not completed its profile yet,
  // send it to profile settings instead of generating a broken /profile/player URL.
  if (!username) {
    redirect("/settings");
  }

  redirect(`/profile/${encodeURIComponent(username)}`);
}
