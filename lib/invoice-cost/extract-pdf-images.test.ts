import { describe, expect, it } from "vitest";
import { extractEmbeddedJpegImages } from "./extract-pdf-images";
import { readPdfTextItems } from "./read-pdf-text";

/** JPEG 1×1 válido. */
const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxISEhUQEhIVFRUVFRUVFRUVFRUVFRUWFxUVFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGhAQGy0lHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAbAAACAwEBAQAAAAAAAAAAAAACAwABBAUGB//EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGf/9k=",
  "base64",
);

function pdfWithJpeg(jpeg: Buffer): Uint8Array {
  const header = "%PDF-1.5\n";
  const dict = `3 0 obj\n<< /Type /XObject /Subtype /Image /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Width 1 /Height 1 /Length ${jpeg.length} >>\nstream\n`;
  const tail = "\nendstream\nendobj\n";
  return new Uint8Array(Buffer.concat([Buffer.from(header), Buffer.from(dict), jpeg, Buffer.from(tail)]));
}

describe("extractEmbeddedJpegImages", () => {
  it("recupera el JPEG de una factura guardada como foto", () => {
    const images = extractEmbeddedJpegImages(pdfWithJpeg(TINY_JPEG));
    expect(images).toHaveLength(1);
    expect(images[0]?.mimeType).toBe("image/jpeg");
    expect(Buffer.from(images[0]!.bytes).equals(TINY_JPEG)).toBe(true);
  });

  it("ignora un PDF sin fotos", () => {
    expect(extractEmbeddedJpegImages(new Uint8Array(Buffer.from("%PDF-1.4\n")))).toEqual([]);
  });

  it("sigue encontrando la foto después de leer el texto del PDF", async () => {
    const bytes = pdfWithJpeg(TINY_JPEG);
    const length = bytes.byteLength;
    await readPdfTextItems(bytes).catch(() => undefined);
    expect(bytes.byteLength).toBe(length);
    expect(extractEmbeddedJpegImages(bytes)).toHaveLength(1);
  });
});
