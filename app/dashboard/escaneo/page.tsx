import { ScannerKioskClient } from "./scanner-kiosk-client";

export const metadata = {
  title: "Escaneo | PLASTICOS LA 16",
  description: "Pantalla para lector de códigos de barras o QR",
};

export default function EscaneoPage() {
  return <ScannerKioskClient />;
}
