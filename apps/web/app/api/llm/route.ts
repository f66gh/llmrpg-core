import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { prompt } = await req.json().catch(() => ({ prompt: "" }));

  return NextResponse.json({
    reply: `Mock LLM response for: ${prompt ?? ""}`,
    provider: "mock"
  });
}
