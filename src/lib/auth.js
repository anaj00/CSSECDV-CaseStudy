import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function getUserFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    return user; 
  } catch (err) {
    return null;
  }
}
