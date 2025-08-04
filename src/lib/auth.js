// Universal version
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function getUserFromCookie(request = null) {
  let token;

  if (request) {
    // Use cookies from request headers (API routes)
    const cookieHeader = request.headers.get("cookie");
    token = cookieHeader
      ?.split(";")
      .find((c) => c.trim().startsWith("accessToken="))
      ?.split("=")[1];
  } else {
    // Use Next.js cookie() (for RSCs)
    const cookieStore = cookies();
    token = cookieStore.get("accessToken")?.value;
  }

  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}
