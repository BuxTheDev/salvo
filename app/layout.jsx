export const metadata = {
  title: "Salvo — fire the whole list",
  description: "Real-estate offer-intelligence engine: import, underwrite, and fire LOIs at volume.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#e9ecf0", padding: "24px 0" }}>{children}</body>
    </html>
  );
}
