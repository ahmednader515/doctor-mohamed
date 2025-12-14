import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    // If no secret key configured, allow verification (for development)
    if (!secretKey) {
      return NextResponse.json({ success: true });
    }

    // Verify token with Google with timeout
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify`;
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(verificationUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `secret=${secretKey}&response=${token}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (data.success) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json(
          { success: false, error: "Verification failed" },
          { status: 400 }
        );
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error("reCAPTCHA verification timeout");
        return NextResponse.json(
          { success: false, error: "Verification timeout" },
          { status: 408 }
        );
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

