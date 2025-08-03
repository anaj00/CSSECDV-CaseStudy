import { NextResponse } from "next/server";
import User from "@/model/users";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import connectToDatabase from "@/lib/mongodb";

export async function POST(request) {
  try {
    await connectToDatabase();
    const { username, email, password } = await request.json();

    // Check required fields
    if (!username || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // Check for existing user
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return NextResponse.json({ error: "Username or email already exists" }, { status: 409 });
    }

    // Create user (pre-save will hash password)
    const newUser = new User({ username, email, password });
    await newUser.save();

    // Auto-login after registration
    const token = jwt.sign(
      { id: newUser._id, username: newUser.username, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const cookieStore = await cookies();
    cookieStore.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });

    return NextResponse.json({ message: "Registered successfully", user: { username: newUser.username, role: newUser.role } }, { status: 201 });
  } catch (error) {
    console.error("Register API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
