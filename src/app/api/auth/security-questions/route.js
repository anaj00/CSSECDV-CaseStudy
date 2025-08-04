import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import User from "@/model/users";
import SecurityLog from "@/model/securitylog";
import { connectToDatabase } from "@/lib/mongodb";
import { getUserFromCookie } from "@/lib/auth";
import { getClientIP } from "@/lib/utils";

const PREDEFINED_QUESTIONS = [
  "What is a specific childhood memory that stands out to you?",
  "What was the name of your first childhood friend?",
  "What is your oldest sibling's middle name?",
  "What street did you live on when you were 10 years old?",
  "What was your childhood nickname that only family used?"
];

const COMMON_ANSWERS = [
  "john", "mary", "mike", "sarah", "david", "main", "first", "mom", "dad", 
  "none", "n/a", "na", "idk", "unknown", "123", "abc", "test"
];

// Set security questions for authenticated user
export async function POST(request) {
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    await connectToDatabase();

    const currentUser = await getUserFromCookie();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questions } = await request.json();

    if (!questions || !Array.isArray(questions) || questions.length < 2) {
      return NextResponse.json(
        { error: "At least 2 security questions are required" },
        { status: 400 }
      );
    }

    // Validate questions and answers
    for (const q of questions) {
      if (!q.question || !q.answer) {
        return NextResponse.json(
          { error: "Question and answer are required for all questions" },
          { status: 400 }
        );
      }

      if (!PREDEFINED_QUESTIONS.includes(q.question)) {
        return NextResponse.json(
          { error: "Invalid question selected" },
          { status: 400 }
        );
      }

      const answer = q.answer.toLowerCase().trim();
      if (answer.length < 8) {
        return NextResponse.json(
          { error: "Answers must be at least 8 characters long" },
          { status: 400 }
        );
      }

      if (COMMON_ANSWERS.includes(answer)) {
        return NextResponse.json(
          { error: "Please provide more specific, unique answers" },
          { status: 400 }
        );
      }
    }

    const user = await User.findById(currentUser.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Set questions (answers will be hashed by pre-save middleware)
    user.securityQuestions = questions.map(q => ({
      question: q.question,
      answer: q.answer, // Don't pre-process, let middleware handle it
      createdAt: new Date()
    }));
    
    // Explicitly mark securityQuestions as modified
    user.markModified('securityQuestions');
    
    console.log('Before save - questions count:', user.securityQuestions.length);
    console.log('Before save - first question:', user.securityQuestions[0]);
    console.log('Is securityQuestions modified?', user.isModified('securityQuestions'));
    
    await user.save();
    
    console.log('After save - questions count:', user.securityQuestions.length);
    console.log('After save - first question answer hashed:', user.securityQuestions[0]?.answer?.startsWith('$2b$'));

    await SecurityLog.logEvent({
      eventType: "SECURITY_QUESTIONS_SET",
      userId: user._id,
      username: user.username,
      ipAddress: clientIP,
      userAgent,
      severity: "LOW",
      details: { questionCount: questions.length },
    });

    return NextResponse.json({ 
      message: "Security questions set successfully",
      count: questions.length 
    });

  } catch (error) {
    console.error("Security questions API Error:", error);

    await SecurityLog.logEvent({
      eventType: "SECURITY_QUESTIONS_FAILURE",
      userId: null,
      username: "unknown",
      ipAddress: clientIP,
      userAgent,
      severity: "HIGH",
      details: {
        reason: "System error",
        error: error.message,
      },
    });

    return NextResponse.json(
      { error: "An error occurred while setting security questions" },
      { status: 500 }
    );
  }
}

// Get security questions for a user (for forgot password flow)
export async function GET(request) {
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ username }).select('+securityQuestions');
    if (!user || !user.securityQuestions || user.securityQuestions.length === 0) {
      // Don't reveal if user exists or has questions set
      return NextResponse.json(
        { error: "No security questions found for this user" },
        { status: 404 }
      );
    }

    // Return only the questions, not the answers
    const questions = user.securityQuestions.map(q => ({
      question: q.question,
      id: q._id
    }));

    await SecurityLog.logEvent({
      eventType: "SECURITY_QUESTIONS_REQUESTED",
      userId: user._id,
      username: user.username,
      ipAddress: clientIP,
      userAgent,
      severity: "LOW",
      details: { requestedFor: "password_reset" },
    });

    return NextResponse.json({ questions });

  } catch (error) {
    console.error("Get security questions API Error:", error);
    return NextResponse.json(
      { error: "An error occurred while retrieving security questions" },
      { status: 500 }
    );
  }
}