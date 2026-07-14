import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const res = await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/api/v1/identity/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
    }

    const data = await res.json();

    if (!data.success) {
      return NextResponse.json({ success: false, message: data.message ?? "Login failed" }, { status: 401 });
    }

    return NextResponse.json({ success: true, data: data.data });
  } catch {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
