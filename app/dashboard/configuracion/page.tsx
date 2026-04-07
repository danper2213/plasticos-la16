import { ConfiguracionClient } from "./configuracion-client";
import { getSocialSettings } from "./actions";

export default async function ConfiguracionPage() {
  const settings = await getSocialSettings();
  return <ConfiguracionClient initialValues={settings} />;
}
