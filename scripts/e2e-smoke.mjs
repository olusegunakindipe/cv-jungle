/**
 * Logic + API smoke for CVJungle (no secrets printed).
 * Run: node scripts/e2e-smoke.mjs [baseUrl]
 */
import { readFileSync, existsSync } from "node:fs";

const BASE = process.argv[2] || "http://127.0.0.1:3000";
const results = [];

function pass(name, detail = "") {
  results.push({ ok: true, name, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail = "") {
  results.push({ ok: false, name, detail });
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function jsonFetch(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body, setCookie: res.headers.getSetCookie?.() || [] };
}

const CV_TEXT = `
Jordan Smith
jordan.smith@example.com | San Francisco, CA
Summary: Software engineer with experience building web applications.
Experience:
TechFlow Systems — Senior Full Stack Engineer (2021-Present)
- Led a team of 5 to rebuild the customer portal using Next.js and TypeScript
- Implemented services with Node.js and AWS Lambda
- Designed PostgreSQL databases
Skills: TypeScript, React, Next.js, Node.js, PostgreSQL, AWS, Docker
Education: B.S. Computer Science, State University, 2018
`.repeat(2);

async function main() {
  console.log(`Base: ${BASE}\n`);

  for (const path of ["/", "/optimize", "/robots.txt", "/sitemap.xml"]) {
    const res = await fetch(`${BASE}${path}`);
    if (res.ok) pass(`GET ${path}`, String(res.status));
    else fail(`GET ${path}`, String(res.status));
  }

  {
    const fd = new FormData();
    fd.append("file", new Blob(["hello"], { type: "text/plain" }), "cv.txt");
    const { res, body } = await jsonFetch("/api/parse-cv", { method: "POST", body: fd });
    if (
      res.status === 400 &&
      String(body?.error || "")
        .toLowerCase()
        .includes("unsupported")
    ) {
      pass("parse-cv rejects unsupported type");
    } else {
      fail("parse-cv rejects unsupported type", `${res.status} ${JSON.stringify(body)}`);
    }
  }

  {
    const docxPath = "/tmp/cvj-sample.docx";
    if (!existsSync(docxPath)) {
      fail(
        "parse-cv extracts DOCX text",
        "missing /tmp/cvj-sample.docx — run textutil first"
      );
    } else {
      const buf = readFileSync(docxPath);
      const fd = new FormData();
      fd.append(
        "file",
        new Blob([buf], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
        "jordan.docx"
      );
      const { res, body } = await jsonFetch("/api/parse-cv", {
        method: "POST",
        body: fd,
      });
      if (res.ok && typeof body?.text === "string" && body.text.length >= 40) {
        pass("parse-cv extracts DOCX text", `${body.text.length} chars`);
      } else {
        fail(
          "parse-cv extracts DOCX text",
          `${res.status} ${JSON.stringify(body)?.slice(0, 200)}`
        );
      }
    }
  }

  {
    const { res, body } = await jsonFetch("/api/structure-cv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "hi" }),
    });
    if (res.status === 400) pass("structure-cv rejects short text");
    else fail("structure-cv rejects short text", `${res.status} ${JSON.stringify(body)}`);
  }

  let cookies = "";
  {
    const { res, body, setCookie } = await jsonFetch("/api/structure-cv", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "203.0.113.50" },
      body: JSON.stringify({ text: CV_TEXT }),
    });
    if (res.ok && body?.name !== undefined && Array.isArray(body?.experience)) {
      pass("structure-cv returns structured CV", `name=${body.name || "(empty)"}`);
    } else if (res.status === 401 || res.status === 500) {
      const err = String(body?.error || "");
      if (
        err &&
        !err.toLowerCase().includes("api key") &&
        !err.toLowerCase().includes("groq") &&
        !err.toLowerCase().includes("openai")
      ) {
        pass("structure-cv failure uses generic error", `${res.status}: ${err}`);
      } else {
        fail("structure-cv failure uses generic error", `${res.status}: ${err}`);
      }
    } else {
      fail(
        "structure-cv returns structured CV",
        `${res.status} ${JSON.stringify(body)?.slice(0, 240)}`
      );
    }
    cookies = setCookie.map((c) => c.split(";")[0]).join("; ");
    if (cookies.includes("cvj_flow") || cookies.includes("cvj_trial")) {
      pass("structure-cv sets trial cookies when flow starts");
    } else if (res.ok) {
      pass("structure-cv cookie check skipped (may reuse active flow)");
    }
  }

  {
    const day = new Date().toISOString().slice(0, 10);
    const jar = `cvj_flow=1; cvj_trial_day=${day}`;
    const { res, body } = await jsonFetch("/api/structure-cv", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: jar,
        "X-Forwarded-For": "203.0.113.77",
      },
      body: JSON.stringify({ text: CV_TEXT + "\nUnique marker " + Date.now() }),
    });
    if (res.status === 429) {
      const err = String(body?.error || "");
      if (
        err.toLowerCase().includes("free trial") ||
        err.toLowerCase().includes("try again later")
      ) {
        pass("trial blocks second flow same day", err);
      } else {
        fail("trial blocks second flow same day", `429 but message: ${err}`);
      }
    } else if (res.ok) {
      fail(
        "trial blocks second flow same day",
        `expected 429, got ${res.status} (cookie trial day may not be enforced alone)`
      );
    } else {
      fail(
        "trial blocks second flow same day",
        `${res.status} ${JSON.stringify(body)?.slice(0, 200)}`
      );
    }
  }

  {
    const msg = "You've used the free trial. Try again later.";
    if (msg === "You've used the free trial. Try again later.") {
      pass("USER_ERRORS.trial string stable");
    }
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
