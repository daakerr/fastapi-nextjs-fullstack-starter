import type { Metadata } from "next";
import "./globals.css";
import "./landing.css";

export const metadata: Metadata = {
  title: "Sireno : en règle avec la facturation électronique, sans expert-comptable",
  description:
    "Contrôle SIREN sur l'annuaire officiel, audit de vos factures, plan guidé en 8 étapes et dossier de bonne foi. La conformité facturation électronique, enfin simple.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
