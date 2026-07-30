import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { getClientIpFromRequest } from "@/lib/client-ip";
import { assertParseRateLimit, isRateLimitError } from "@/lib/rate-limit";
import { USER_ERRORS } from "@/lib/action-errors";

export async function POST(req: Request) {
  try {
    assertParseRateLimit(getClientIpFromRequest(req));

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json(
        { error: "Please choose a CV file to upload." },
        { status: 400 }
      );
    }

    // Soft size guard (10MB) — matches upload UI copy
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File is too large. Please upload a CV under 10MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      return NextResponse.json(
        {
          error: "Unsupported file type. Please upload a PDF or DOCX file.",
        },
        { status: 400 }
      );
    }

    if (!text?.trim() || text.trim().length < 40) {
      return NextResponse.json(
        {
          error:
            "Could not read enough text from this file. Try a text-based PDF or DOCX (not a scanned image).",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { error: USER_ERRORS.busy, code: "RATE_LIMIT" },
        {
          status: 429,
          headers: { "Retry-After": String(error.retryAfterSec) },
        }
      );
    }
    console.error("Error parsing CV:", error);
    return NextResponse.json(
      {
        error:
          "We couldn't read that CV. Please try a different PDF or DOCX (not password protected).",
      },
      { status: 500 }
    );
  }
}
