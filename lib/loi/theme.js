import { StyleSheet } from "@react-pdf/renderer";

// Formal legal-letter styling for the LOI documents, matching the BrightPath
// LOI templates (a plain business letter, not a marketing one-pager).
export const C = {
  ink: "#1a1a1a",
  ink2: "#555555",
  line: "#1a1a1a",
  hairline: "#c9ced4",
};

export const BUYER = "BrightPath Real Estate Solutions, LLC";

export const styles = StyleSheet.create({
  page: { paddingTop: 54, paddingBottom: 56, paddingHorizontal: 58, fontSize: 10, fontFamily: "Helvetica", color: C.ink, lineHeight: 1.45 },

  title: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "center" },
  addr: { fontSize: 10.5, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 3 },
  date: { fontSize: 10, textAlign: "center", marginTop: 2, marginBottom: 16, color: C.ink2 },

  para: { marginBottom: 9, textAlign: "justify" },
  strong: { fontFamily: "Helvetica-Bold" },
  section: { fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 5 },

  termRow: { flexDirection: "row" },
  termLabel: { fontFamily: "Helvetica-Bold", width: 210, paddingRight: 8 },
  termValue: { flex: 1 },
  termNote: { marginLeft: 210, fontSize: 8.5, color: C.ink2, fontFamily: "Helvetica-Oblique", marginBottom: 2 },

  bulletRow: { flexDirection: "row", marginBottom: 4 },
  bulletDot: { width: 12, color: C.ink },
  bulletText: { flex: 1, textAlign: "justify" },

  sigRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  sigCell: { width: "45%" },
  sigLine: { borderTopWidth: 1, borderTopColor: C.line, marginTop: 26, paddingTop: 3 },
  sigLbl: { fontSize: 8.5, color: C.ink2 },
});
