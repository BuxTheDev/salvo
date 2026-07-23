"use client";
import dynamic from "next/dynamic";

// The Salvo console is a client-only component (uses @react-pdf/renderer and
// browser download APIs), so render it without SSR.
const Salvo = dynamic(() => import("../Salvo.jsx"), { ssr: false });

export default function Page() {
  return <Salvo />;
}
