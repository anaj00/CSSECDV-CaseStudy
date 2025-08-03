import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";

export async function getUserFromCookie() {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const token = await getToken({
      req: { headers: { cookie: cookieHeader } },
      secret: process.env.NEXTAUTH_SECRET,
    });

    return token;
  } catch (err) {
    console.error("Failed to parse session token:", err.message);
    return null;
  }
}
