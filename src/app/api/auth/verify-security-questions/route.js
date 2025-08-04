import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "@/model/users";
import SecurityLog from "@/model/securitylog";
import { connectToDatabase } from "@/lib/mongodb";
import { getClientIP } from "@/lib/utils";

export async function POST(request) {
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    await connectToDatabase();

    const { username, answers } = await request.json();

    if (!username || !answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        { error: "Username and answers are required" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ username }).select("+securityQuestions.answer");
    if (!user || !user.securityQuestions || user.securityQuestions.length === 0) {
      await SecurityLog.logEvent({
        eventType: "SECURITY_QUESTIONS_VERIFY_FAILURE",
        userId: null,
        username: username,
        ipAddress: clientIP,
        userAgent,
        severity: "MEDIUM",
        details: { reason: "User not found or no questions set" },
      });

      return NextResponse.json(
        { error: "Invalid verification attempt" },
        { status: 401 }
      );
    }

    // Verify all provided answers
    let correctAnswers = 0;
    console.log('Verifying answers for user:', username);
    console.log('User has questions count:', user.securityQuestions.length);
    console.log('Received answers count:', answers.length);
    
    for (const answer of answers) {
      console.log('Looking for question ID:', answer.questionId);
      const question = user.securityQuestions.find(q => 
        q._id.toString() === answer.questionId
      );

      if (question) {
        console.log('Found question:', question.question);
        console.log('Question has answer:', !!question.answer);
        console.log('Provided answer:', answer.answer);
        console.log('Stored answer exists:', !!question.answer);
        console.log('Stored answer starts with $2b$:', question.answer ? question.answer.startsWith('$2b$') : 'no answer');
        
        if (!question.answer) {
          console.log('ERROR: Question answer is null/undefined');
          continue;
        }
        
        if (!answer.answer) {
          console.log('ERROR: Provided answer is null/undefined');
          continue;
        }
        
        try {
          const isMatch = await bcrypt.compare(
            answer.answer.toLowerCase().trim(),
            question.answer
          );
          console.log('Answer match result:', isMatch);
          if (isMatch) correctAnswers++;
        } catch (compareError) {
          console.log('Bcrypt compare error:', compareError.message);
        }
      } else {
        console.log('Question not found for ID:', answer.questionId);
      }
    }
    
    console.log('Total correct answers:', correctAnswers);

    // Require all answers to be correct
    if (correctAnswers !== answers.length || correctAnswers < 2) {
      await SecurityLog.logEvent({
        eventType: "SECURITY_QUESTIONS_VERIFY_FAILURE",
        userId: user._id,
        username: user.username,
        ipAddress: clientIP,
        userAgent,
        severity: "HIGH",
        details: { 
          reason: "Incorrect answers",
          correctCount: correctAnswers,
          totalQuestions: answers.length
        },
      });

      return NextResponse.json(
        { error: "Security question answers are incorrect" },
        { status: 401 }
      );
    }

    // Generate temporary token for password reset (valid for 15 minutes)
    const resetToken = jwt.sign(
      { 
        id: user._id, 
        username: user.username,
        purpose: "password_reset",
        timestamp: Date.now()
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    await SecurityLog.logEvent({
      eventType: "SECURITY_QUESTIONS_VERIFY_SUCCESS",
      userId: user._id,
      username: user.username,
      ipAddress: clientIP,
      userAgent,
      severity: "MEDIUM",
      details: { purpose: "password_reset" },
    });

    return NextResponse.json({ 
      message: "Security questions verified successfully",
      resetToken 
    });

  } catch (error) {
    console.error("Verify security questions API Error:", error);

    await SecurityLog.logEvent({
      eventType: "SECURITY_QUESTIONS_VERIFY_FAILURE",
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
      { error: "An error occurred while verifying security questions" },
      { status: 500 }
    );
  }
}