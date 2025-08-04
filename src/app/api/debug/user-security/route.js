import { NextResponse } from "next/server";
import User from "@/model/users";
import { connectToDatabase } from "@/lib/mongodb";
import { getUserFromCookie } from "@/lib/auth";

export async function GET(request) {
  try {
    await connectToDatabase();

    const currentUser = await getUserFromCookie();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(currentUser.id).select('+securityQuestions');
    
    return NextResponse.json({
      username: user.username,
      hasSecurityQuestions: !!user.securityQuestions && user.securityQuestions.length > 0,
      questionCount: user.securityQuestions ? user.securityQuestions.length : 0,
      questions: user.securityQuestions ? user.securityQuestions.map(q => ({
        question: q.question,
        hasAnswer: !!q.answer,
        answerLength: q.answer ? q.answer.length : 0,
        isHashed: q.answer ? q.answer.startsWith('$2b$') : false,
        createdAt: q.createdAt
      })) : []
    });

  } catch (error) {
    console.error("Debug API Error:", error);
    return NextResponse.json(
      { error: "Debug error", details: error.message },
      { status: 500 }
    );
  }
}