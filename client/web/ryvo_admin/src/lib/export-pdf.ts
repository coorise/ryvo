import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/** Capture a DOM subtree and download as PDF (client-only). */
export async function exportElementToPdf(element: HTMLElement, filename: string, title?: string) {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const img = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 28;
  let y = margin;

  if (title) {
    pdf.setFontSize(14);
    pdf.text(title, margin, y);
    y += 22;
  }

  const maxW = pageW - margin * 2;
  const maxH = pageH - y - margin;
  const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
  const w = canvas.width * ratio;
  const h = canvas.height * ratio;

  pdf.addImage(img, "PNG", margin, y, w, h);
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
