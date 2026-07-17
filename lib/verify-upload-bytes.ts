/** Verifica magic bytes del archivo; no confía solo en file.type del cliente. */

function readHeader(file: File, length: number): Promise<Uint8Array> {
  return file.slice(0, length).arrayBuffer().then((buf) => new Uint8Array(buf));
}

function matchesBytes(header: Uint8Array, bytes: number[], offset = 0): boolean {
  return bytes.every((byte, index) => header[offset + index] === byte);
}

export async function detectImageMimeFromBytes(file: File): Promise<string | null> {
  const header = await readHeader(file, 12);

  if (matchesBytes(header, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (matchesBytes(header, [0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (matchesBytes(header, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (
    matchesBytes(header, [0x52, 0x49, 0x46, 0x46]) &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export async function detectVideoMimeFromBytes(file: File): Promise<string | null> {
  const header = await readHeader(file, 16);

  if (matchesBytes(header, [0x1a, 0x45, 0xdf, 0xa3])) return "video/webm";
  if (
    header[4] === 0x66 &&
    header[5] === 0x74 &&
    header[6] === 0x79 &&
    header[7] === 0x70
  ) {
    return "video/mp4";
  }

  return null;
}

export async function verifySocialUploadMime(
  file: File,
  declaredMime: string,
): Promise<{ ok: true; mime: string } | { ok: false; error: string }> {
  const normalized = declaredMime.toLowerCase();

  if (normalized.startsWith("image/")) {
    const detected = await detectImageMimeFromBytes(file);
    if (!detected) {
      return { ok: false, error: "El archivo no es una imagen válida." };
    }
    if (detected !== normalized) {
      return { ok: false, error: "El tipo declarado no coincide con el contenido del archivo." };
    }
    return { ok: true, mime: detected };
  }

  if (normalized.startsWith("video/")) {
    const detected = await detectVideoMimeFromBytes(file);
    if (!detected) {
      return { ok: false, error: "El archivo no es un video válido (MP4 o WebM)." };
    }
    if (detected !== normalized) {
      return { ok: false, error: "El tipo declarado no coincide con el contenido del archivo." };
    }
    return { ok: true, mime: detected };
  }

  return { ok: false, error: "Formato no permitido." };
}
