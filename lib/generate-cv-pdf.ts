import { jsPDF } from "jspdf";
import { OptimizedCV, trimAtSentence } from "@/lib/optimize-cv";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MAX_PAGES = 2;

const COLOR = {
  black: [17, 17, 17] as [number, number, number],
  dark: [40, 40, 40] as [number, number, number],
  muted: [85, 85, 85] as [number, number, number],
  line: [25, 25, 25] as [number, number, number],
};

type Density = {
  marginX: number;
  marginTop: number;
  marginBottom: number;
  nameSize: number;
  sectionSize: number;
  bodySize: number;
  bulletSize: number;
  lineH: number;
  sectionGap: number;
  roleGap: number;
};

const DENSITY_COMFORTABLE: Density = {
  marginX: 42,
  marginTop: 40,
  marginBottom: 40,
  nameSize: 18,
  sectionSize: 10,
  bodySize: 9.5,
  bulletSize: 9.5,
  lineH: 12,
  sectionGap: 8,
  roleGap: 8,
};

const DENSITY_COMPACT: Density = {
  marginX: 36,
  marginTop: 32,
  marginBottom: 32,
  nameSize: 16,
  sectionSize: 9.5,
  bodySize: 9,
  bulletSize: 9,
  lineH: 11,
  sectionGap: 6,
  roleGap: 6,
};

function setColor(doc: jsPDF, rgb: [number, number, number]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text || "", maxWidth) as string[];
}

function renderCv(doc: jsPDF, cv: OptimizedCV, density: Density): number {
  const contentWidth = PAGE_WIDTH - density.marginX * 2;
  let y = density.marginTop;
  let pageCount = 1;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_HEIGHT - density.marginBottom) {
      doc.addPage();
      pageCount += 1;
      y = density.marginTop;
    }
  };

  const drawSectionTitle = (title: string) => {
    ensureSpace(28);
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(density.sectionSize);
    setColor(doc, COLOR.black);
    doc.text(title.toUpperCase(), density.marginX, y);
    y += 3;
    doc.setDrawColor(COLOR.line[0], COLOR.line[1], COLOR.line[2]);
    doc.setLineWidth(0.8);
    doc.line(density.marginX, y, PAGE_WIDTH - density.marginX, y);
    y += density.lineH;
  };

  // Header
  const name = (cv.name || "Professional").toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(density.nameSize);
  setColor(doc, COLOR.black);
  doc.text(name, PAGE_WIDTH / 2, y, { align: "center" });
  y += density.lineH + 2;

  const contactParts = [cv.location, cv.phone, cv.email].filter(Boolean);
  if (contactParts.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(density.bodySize - 0.5);
    setColor(doc, COLOR.muted);
    doc.text(contactParts.join("  •  "), PAGE_WIDTH / 2, y, {
      align: "center",
    });
    y += density.lineH;
  }

  if (cv.targetRole) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(density.bodySize);
    setColor(doc, COLOR.dark);
    doc.text(cv.targetRole, PAGE_WIDTH / 2, y, { align: "center" });
    y += density.lineH - 1;
  }

  doc.setDrawColor(COLOR.line[0], COLOR.line[1], COLOR.line[2]);
  doc.setLineWidth(1.2);
  doc.line(density.marginX, y + 2, PAGE_WIDTH - density.marginX, y + 2);
  y += density.sectionGap + 6;

  if (cv.summary?.trim()) {
    drawSectionTitle("Professional Summary");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(density.bodySize);
    setColor(doc, COLOR.dark);
    const lines = wrapText(doc, cv.summary.trim(), contentWidth);
    lines.forEach((line) => {
      ensureSpace(density.lineH);
      doc.text(line, density.marginX, y);
      y += density.lineH;
    });
    y += density.sectionGap;
  }

  if (cv.skills?.length) {
    drawSectionTitle("Core Skills");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(density.bodySize);
    setColor(doc, COLOR.dark);
    const lines = wrapText(doc, cv.skills.join("  •  "), contentWidth);
    lines.forEach((line) => {
      ensureSpace(density.lineH);
      doc.text(line, density.marginX, y);
      y += density.lineH;
    });
    y += density.sectionGap;
  }

  if (cv.experience?.length) {
    drawSectionTitle("Professional Experience");

    for (const exp of cv.experience) {
      ensureSpace(36);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(density.bodySize + 0.5);
      setColor(doc, COLOR.black);

      const roleLine = [exp.role, exp.company].filter(Boolean).join("  —  ");
      const duration = exp.duration || "";
      const durationWidth = duration ? doc.getTextWidth(duration) : 0;
      const roleLines = wrapText(doc, roleLine, contentWidth - durationWidth - 10);

      doc.text(roleLines[0] || "", density.marginX, y);
      if (duration) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(density.bodySize - 0.5);
        setColor(doc, COLOR.muted);
        doc.text(duration, PAGE_WIDTH - density.marginX, y, {
          align: "right",
        });
      }
      y += density.lineH;

      if (roleLines.length > 1) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(density.bodySize + 0.5);
        setColor(doc, COLOR.black);
        for (let i = 1; i < roleLines.length; i++) {
          ensureSpace(density.lineH);
          doc.text(roleLines[i], density.marginX, y);
          y += density.lineH;
        }
      }

      for (const bullet of exp.description || []) {
        const clean = bullet.replace(/^[\s\-•▸●○▪►]+/, "").trim();
        if (!clean) continue;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(density.bulletSize);
        setColor(doc, COLOR.dark);
        const bulletLines = wrapText(doc, clean, contentWidth - 14);
        ensureSpace(bulletLines.length * density.lineH);
        doc.text("•", density.marginX + 1, y);
        doc.text(bulletLines[0], density.marginX + 12, y);
        y += density.lineH;
        for (let i = 1; i < bulletLines.length; i++) {
          ensureSpace(density.lineH);
          doc.text(bulletLines[i], density.marginX + 12, y);
          y += density.lineH;
        }
      }
      y += density.roleGap;
    }
  }

  if (cv.education?.length) {
    drawSectionTitle("Education");
    for (const edu of cv.education) {
      ensureSpace(28);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(density.bodySize);
      setColor(doc, COLOR.black);
      doc.text(edu.degree || "", density.marginX, y);
      if (edu.year) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(density.bodySize - 0.5);
        setColor(doc, COLOR.muted);
        doc.text(edu.year, PAGE_WIDTH - density.marginX, y, {
          align: "right",
        });
      }
      y += density.lineH;
      if (edu.institution) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(density.bodySize);
        setColor(doc, COLOR.dark);
        doc.text(edu.institution, density.marginX, y);
        y += density.lineH;
      }
      y += 2;
    }
  }

  return pageCount;
}

/**
 * ATS-friendly text PDF. Prefer denser layout over dropping achievements.
 * Soft-trim only if still over 2 pages after compact density.
 */
export async function generateCvPdf(cv: OptimizedCV, filename?: string): Promise<void> {
  const tryRender = (density: Density, data: OptimizedCV) => {
    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
      orientation: "portrait",
    });
    const pages = renderCv(doc, data, density);
    return { doc, pages };
  };

  // Pass 1: comfortable density, full content
  let { doc, pages } = tryRender(DENSITY_COMFORTABLE, cv);

  // Pass 2: compact density before cutting content
  if (pages > 1) {
    const compactAttempt = tryRender(DENSITY_COMPACT, cv);
    if (compactAttempt.pages <= MAX_PAGES) {
      doc = compactAttempt.doc;
      pages = compactAttempt.pages;
    }
  }

  // Pass 3: only if still over 2 pages — trim lightly, keep most bullets
  if (pages > MAX_PAGES) {
    const tighter: OptimizedCV = {
      ...cv,
      summary: trimAtSentence(cv.summary || "", 720),
      skills: (cv.skills || []).slice(0, 20),
      experience: (cv.experience || []).slice(0, 4).map((e) => ({
        ...e,
        description: (e.description || []).slice(0, 6),
      })),
      education: (cv.education || []).slice(0, 2),
    };
    ({ doc, pages } = tryRender(DENSITY_COMPACT, tighter));
  }

  // Last resort hard cap at 2 pages — still keep meaningful bullets
  if (pages > MAX_PAGES) {
    const minimal: OptimizedCV = {
      ...cv,
      summary: trimAtSentence(cv.summary || "", 520),
      skills: (cv.skills || []).slice(0, 16),
      experience: (cv.experience || []).slice(0, 3).map((e) => ({
        ...e,
        description: (e.description || []).slice(0, 5),
      })),
      education: (cv.education || []).slice(0, 2),
    };
    ({ doc } = tryRender(DENSITY_COMPACT, minimal));
  }

  const safeName = (cv.name || "CV").replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
  const safeRole = (cv.targetRole || "Optimized")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_");
  doc.save(filename || `${safeName}_${safeRole}_CV.pdf`);
}
