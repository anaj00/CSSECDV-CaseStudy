import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export function getUserFromCookie() {
  const token = cookies().get("token")?.value;
  if (!token) return null;

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    return user; 
  } catch (err) {
    return null;
  }
}
