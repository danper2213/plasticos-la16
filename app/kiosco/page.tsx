import { PriceKioskClient } from "./price-kiosk-client";

export const metadata = {
  title: "Consulta de Precios | PLASTICOS LA 16",
  description: "Verificador de precios para el local",
};

export default function KioscoPage() {
  return <PriceKioskClient />;
}
