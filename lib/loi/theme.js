import { StyleSheet } from "@react-pdf/renderer";

// Salvo "Ordnance" palette (subset), applied to the printable LOI documents.
export const C = {
  ink: "#161c22",
  ink2: "#5a6672",
  gold: "#e86a2a",
  goldSoft: "#fdeadf",
  steel: "#356886",
  gain: "#0f7a52",
  line: "#d6dbe0",
};

export const BUYER = "BrightPath Real Estate Solutions, LLC (and/or assigns)";

export const styles = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 38, paddingHorizontal: 50, fontSize: 9, fontFamily: "Helvetica", color: C.ink, lineHeight: 1.35 },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold", letterSpacing: 4, color: C.ink, lineHeight: 1 },
  tag: { fontSize: 8, color: C.ink2, fontFamily: "Helvetica-Oblique", marginTop: 5 },
  buyerBlock: { textAlign: "right" },
  buyerName: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.ink },
  meta: { fontSize: 8.5, color: C.ink2 },
  rule: { height: 2, backgroundColor: C.gold, marginTop: 8, marginBottom: 14 },
  title: { fontSize: 13.5, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  subtitle: { fontSize: 9, color: C.ink2, marginBottom: 12 },
  recipient: { marginBottom: 11 },
  label: { fontSize: 8, color: C.ink2, textTransform: "uppercase", letterSpacing: 1 },
  strong: { fontFamily: "Helvetica-Bold" },
  para: { marginBottom: 8 },
  sectionHead: { fontSize: 8.5, color: C.ink2, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6, fontFamily: "Helvetica-Bold" },
  table: { borderWidth: 1, borderColor: C.line, borderRadius: 6, marginBottom: 12 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#eef1f4" },
  rowLast: { flexDirection: "row" },
  cellL: { flex: 1.4, padding: 5, color: C.ink2 },
  cellR: { flex: 1, padding: 5, textAlign: "right", fontFamily: "Helvetica-Bold" },
  hook: { backgroundColor: C.goldSoft, borderRadius: 6, padding: 11, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: C.gold },
  hookLabel: { fontSize: 8, color: "#b3560f", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3, fontFamily: "Helvetica-Bold" },
  hookBig: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#7a3d12" },
  hookSub: { fontSize: 8.5, color: "#7a3d12", marginTop: 3 },
  clause: { flexDirection: "row", marginBottom: 3 },
  bullet: { width: 12, color: C.gold, fontFamily: "Helvetica-Bold" },
  clauseText: { flex: 1 },
  sign: { marginTop: 12 },
  signLine: { marginTop: 16, borderTopWidth: 1, borderTopColor: C.ink, width: 220, paddingTop: 4, fontSize: 9, color: C.ink2 },
  footer: { position: "absolute", bottom: 26, left: 52, right: 52, fontSize: 7.5, color: C.ink2, textAlign: "center", borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6 },
});
