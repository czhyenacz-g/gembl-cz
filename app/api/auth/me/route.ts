import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth/current-user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ loggedIn: false });
  return NextResponse.json({ loggedIn: true, email: user.email, credits: user.credits });
}
