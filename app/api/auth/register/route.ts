import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

async function verifyRecaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  
  if (!secretKey) {
    console.error("RECAPTCHA_SECRET_KEY is not set");
    return false;
  }

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const { fullName, phoneNumber, parentPhoneNumber, password, confirmPassword, subject, grade, semester, recaptchaToken } = await req.json();

    if (!fullName || !phoneNumber || !parentPhoneNumber || !password || !confirmPassword || !grade) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Semester is only required for الصف الاول الثانوي and الصف الثاني الثانوي
    if (grade !== "الصف الثالث الثانوي" && !semester) {
      return new NextResponse("Semester is required for this grade", { status: 400 });
    }

    // Validate subject based on grade
    if (grade === "الصف الاول الثانوي") {
      if (!subject || subject !== "علوم متكاملة") {
        return new NextResponse("Invalid subject for grade", { status: 400 });
      }
    } else if (grade === "الصف الثاني الثانوي" || grade === "الصف الثالث الثانوي") {
      if (!subject || subject.trim() === "") {
        return new NextResponse("Please select at least one subject", { status: 400 });
      }
      // Validate that subject contains only valid values (كيمياء, فيزياء)
      const subjects = subject.split(",").map(s => s.trim());
      const validSubjects = ["كيمياء", "فيزياء"];
      const invalidSubjects = subjects.filter(s => !validSubjects.includes(s));
      if (invalidSubjects.length > 0) {
        return new NextResponse("Invalid subject selected", { status: 400 });
      }
    } else {
      return new NextResponse("Invalid grade", { status: 400 });
    }

    // Verify reCAPTCHA if secret key is configured
    if (process.env.RECAPTCHA_SECRET_KEY) {
      if (!recaptchaToken) {
        return new NextResponse("reCAPTCHA verification is required", { status: 400 });
      }

      const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
      if (!isRecaptchaValid) {
        return new NextResponse("reCAPTCHA verification failed", { status: 400 });
      }
    }

    if (password !== confirmPassword) {
      return new NextResponse("Passwords do not match", { status: 400 });
    }

    // Check if phone number is the same as parent phone number
    if (phoneNumber === parentPhoneNumber) {
      return new NextResponse("Phone number cannot be the same as parent phone number", { status: 400 });
    }

    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { phoneNumber },
          { parentPhoneNumber }
        ]
      },
    });

    if (existingUser) {
      if (existingUser.phoneNumber === phoneNumber) {
        return new NextResponse("Phone number already exists", { status: 400 });
      }
      if (existingUser.parentPhoneNumber === parentPhoneNumber) {
        return new NextResponse("Parent phone number already exists", { status: 400 });
      }
    }

    // Hash password (no complexity requirements)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user directly without email verification
    // Semester is only saved for الصف الاول الثانوي and الصف الثاني الثانوي
    await db.user.create({
      data: {
        fullName,
        phoneNumber,
        parentPhoneNumber,
        hashedPassword,
        role: "USER",
        subject,
        grade,
        semester: grade === "الصف الثالث الثانوي" ? null : semester,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[REGISTER]", error);
    
    // If the table doesn't exist or there's a database connection issue,
    // return a specific error message
    if (error instanceof Error && (
      error.message.includes("does not exist") || 
      error.message.includes("P2021") ||
      error.message.includes("table")
    )) {
      return new NextResponse("Database not initialized. Please run database migrations.", { status: 503 });
    }
    
    return new NextResponse("Internal Error", { status: 500 });
  }
} 