export type EmbeddedPdfJpeg = {
  mimeType: "image/jpeg";
  bytes: Uint8Array;
};

const MIN_JPEG_BYTES = 32;

/**
 * Saca las fotos JPEG incrustadas en un PDF (facturas escaneadas o
 * exportadas como imagen). El stream DCTDecode ya es un JPEG.
 */
export function extractEmbeddedJpegImages(pdf: Uint8Array): EmbeddedPdfJpeg[] {
  const text = Buffer.from(pdf).toString("latin1");
  const images: EmbeddedPdfJpeg[] = [];
  let searchFrom = 0;

  while (searchFrom < text.length) {
    const filterAt = text.indexOf("/DCTDecode", searchFrom);
    if (filterAt < 0) break;

    const dictStart = text.lastIndexOf("<<", filterAt);
    const streamAt = text.indexOf("stream", filterAt);
    if (dictStart < 0 || streamAt < 0 || streamAt - dictStart > 4_000) {
      searchFrom = filterAt + "/DCTDecode".length;
      continue;
    }

    const dict = text.slice(dictStart, streamAt);
    if (!/\/Subtype\s*\/Image/.test(dict) && !/\/Image\b/.test(dict)) {
      searchFrom = filterAt + "/DCTDecode".length;
      continue;
    }

    let dataStart = streamAt + "stream".length;
    if (pdf[dataStart] === 0x0d && pdf[dataStart + 1] === 0x0a) dataStart += 2;
    else if (pdf[dataStart] === 0x0a || pdf[dataStart] === 0x0d) dataStart += 1;

    const lengthMatch = dict.match(/\/Length\s+(\d+)/);
    let length = lengthMatch ? Number(lengthMatch[1]) : 0;
    if (!length) {
      const endAt = text.indexOf("endstream", dataStart);
      if (endAt < 0) {
        searchFrom = dataStart + 1;
        continue;
      }
      length = endAt - dataStart;
      if (
        length > 2 &&
        pdf[dataStart + length - 2] === 0x0d &&
        pdf[dataStart + length - 1] === 0x0a
      ) {
        length -= 2;
      } else if (
        length > 1 &&
        (pdf[dataStart + length - 1] === 0x0a ||
          pdf[dataStart + length - 1] === 0x0d)
      ) {
        length -= 1;
      }
    }

    const slice = pdf.subarray(dataStart, dataStart + length);
    const isJpeg =
      slice.byteLength >= MIN_JPEG_BYTES &&
      slice[0] === 0xff &&
      slice[1] === 0xd8 &&
      slice[slice.byteLength - 2] === 0xff &&
      slice[slice.byteLength - 1] === 0xd9;

    if (isJpeg) {
      images.push({ mimeType: "image/jpeg", bytes: slice });
      searchFrom = dataStart + length;
    } else {
      searchFrom = filterAt + "/DCTDecode".length;
    }
  }

  images.sort((a, b) => b.bytes.byteLength - a.bytes.byteLength);
  return images;
}
