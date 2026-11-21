import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { config } from "../config/index.js";
import { assert } from "../domain.mjs";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 100000000;
const IMAGE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i;
const missing = (error) => error.code === "ENOENT" || error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404;

export async function normalizeProfileImage(type, file) {
  assert(["foto", "banner"].includes(type), 422, "Tipo de imagen inválido.");
  assert(file && Buffer.isBuffer(file.buffer) && ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype), 422, "Selecciona una imagen JPEG, PNG o WebP.");
  assert(file.buffer.length <= MAX_IMAGE_BYTES, 422, "La imagen no debe superar los 10 MB.");
  try {
    const image = sharp(file.buffer, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: "error", sequentialRead: true });
    const metadata = await image.metadata();
    assert(["jpeg", "png", "webp"].includes(metadata.format), 422, "Selecciona una imagen JPEG, PNG o WebP.");
    const banner = type === "banner";
    return await image.rotate().resize(banner ? 1600 : 400, banner ? 500 : 400, { fit: "cover" }).webp({ quality: 85 }).toBuffer();
  } catch (error) {
    if (error.status) throw error;
    if (/pixel limit/i.test(error.message || "")) {
      assert(false, 422, "La imagen tiene demasiada resolución. Usa una imagen de hasta 100 megapíxeles.");
    }
    console.error("No se pudo procesar una imagen de perfil:", error.message);
    assert(false, 422, "No se pudo leer la imagen.");
  }
}

// Las referencias públicas permanecen estables; las credenciales nunca salen del backend.
export function createImageStore({ directory = config.uploadDir, bucket = config.s3.bucket, client } = {}) {
  const s3 = client || (bucket ? new S3Client({
    endpoint: config.s3.endpoint,
    region: config.s3.region,
    forcePathStyle: config.s3.forcePathStyle,
    credentials: { accessKeyId: config.s3.accessKeyId, secretAccessKey: config.s3.secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  }) : null);
  const key = (name) => `profiles/${name}`;
  let checkedAt = 0;
  const validate = (name) => assert(typeof name === "string" && IMAGE_NAME.test(name), 404, "Imagen no encontrada.");
  const put = async (name, bytes) => {
    if (s3) await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key(name), Body: bytes, ContentType: "image/webp", CacheControl: "public, max-age=604800, immutable" }));
    else { await mkdir(directory, { recursive: true }); await writeFile(join(directory, name), bytes); }
  };
  return {
    async check() {
      if (s3 && Date.now() - checkedAt > 30000) {
        await s3.send(new HeadBucketCommand({ Bucket: bucket }));
        checkedAt = Date.now();
      }
    },
    async save(bytes) {
      const name = `${randomUUID()}.webp`;
      await put(name, bytes);
      return `/uploads/${name}`;
    },
    async read(name) {
      validate(name);
      if (s3) {
        try {
          const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key(name) }));
          return Buffer.from(await result.Body.transformToByteArray());
        } catch (error) { if (!missing(error)) throw error; }
      }
      // Migra imágenes que todavía existen en el volumen sin cambiar su URL.
      let bytes;
      try { bytes = await readFile(join(directory, name)); }
      catch (error) { if (missing(error)) assert(false, 404, "Imagen no encontrada."); throw error; }
      if (s3) await put(name, bytes);
      return bytes;
    },
    async remove(url) {
      if (typeof url !== "string" || !url.startsWith("/uploads/")) return;
      const name = url.slice("/uploads/".length);
      if (!IMAGE_NAME.test(name)) return;
      if (s3) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key(name) }));
      await unlink(join(directory, name)).catch((error) => { if (!missing(error)) throw error; });
    },
  };
}

export const imageStore = createImageStore();
