import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { createImageStore, normalizeProfileImage, MAX_IMAGE_BYTES } from "../src/storage/profile-images.mjs";

const fixture = async () => sharp({ create: { width: 20, height: 30, channels: 3, background: "#35bec9" } }).png().toBuffer();
const file = (buffer, mimetype = "image/png") => ({ buffer, size: buffer.length, mimetype });
function fakeBucket() {
  const objects = new Map();
  const client = { async send(command) {
    const input = command.input;
    if (command.constructor.name === "PutObjectCommand") { objects.set(input.Key, { bytes: Buffer.from(input.Body), type: input.ContentType }); return {}; }
    if (command.constructor.name === "DeleteObjectCommand") { objects.delete(input.Key); return {}; }
    const value = objects.get(input.Key);
    if (!value) throw Object.assign(new Error("not found"), { name: "NoSuchKey" });
    return { Body: { transformToByteArray: async () => value.bytes } };
  } };
  return { objects, client };
}

test("fotos y banners aceptan 10 MB y se normalizan como WebP", async () => {
  const image = await fixture();
  const input = Buffer.concat([image, Buffer.alloc(MAX_IMAGE_BYTES - image.length)]);
  for (const type of ["foto", "banner"]) {
    const output = await normalizeProfileImage(type, file(input));
    const meta = await sharp(output).metadata();
    assert.equal(meta.format, "webp");
    assert.equal(meta.width, type === "foto" ? 400 : 1600);
    assert.equal(meta.height, type === "foto" ? 400 : 500);
  }
});

test("rechaza más de 10 MB y contenido que no es una imagen admitida", async () => {
  await assert.rejects(normalizeProfileImage("foto", file(Buffer.alloc(MAX_IMAGE_BYTES + 1))), /10 MB/);
  await assert.rejects(normalizeProfileImage("banner", file(Buffer.from("no es una imagen"))), /leer la imagen/);
  await assert.rejects(normalizeProfileImage("foto", file(await fixture(), "image/gif")), /JPEG, PNG o WebP/);
});

test("un banner válido de más de 24 megapíxeles ya no se rechaza por su resolución", async () => {
  const input = await sharp({ create: { width: 5000, height: 5000, channels: 3, background: "#35bec9" } }).png().toBuffer();
  assert.ok(input.length < MAX_IMAGE_BYTES);
  const output = await normalizeProfileImage("banner", file(input));
  const meta = await sharp(output).metadata();
  assert.equal(meta.width, 1600);
  assert.equal(meta.height, 500);
  assert.equal(meta.format, "webp");
});

test("una imagen del bucket sigue disponible en otra instancia y se puede reemplazar", async () => {
  const { client, objects } = fakeBucket();
  const store = createImageStore({ bucket: "test", client });
  const bytes = await fixture();
  const url = await store.save(bytes);
  assert.match(url, /^\/uploads\/[a-f0-9-]+\.webp$/);
  const other = createImageStore({ bucket: "test", client });
  assert.deepEqual(await other.read(url.split("/").at(-1)), bytes);
  assert.equal([...objects.values()][0].type, "image/webp");
  await other.remove(url);
  assert.equal(objects.size, 0);
});

test("migra una imagen del volumen sin cambiar la URL y no depende del volumen después", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nvjc-images-"));
  const name = "2e7de88b-bbcd-4919-957c-0a9ed224d546.webp";
  const bytes = await fixture();
  const { client, objects } = fakeBucket();
  try {
    await writeFile(join(directory, name), bytes);
    const store = createImageStore({ directory, bucket: "test", client });
    assert.deepEqual(await store.read(name), bytes);
    assert.equal(objects.size, 1);
    await rm(directory, { recursive: true });
    assert.deepEqual(await createImageStore({ directory, bucket: "test", client }).read(name), bytes);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("no sirve rutas arbitrarias ni oculta errores de acceso al bucket", async () => {
  const { client, objects } = fakeBucket();
  const store = createImageStore({ bucket: "test", client });
  for (const name of ["../.env", "avatar.svg", "profiles/secret.webp"]) {
    await assert.rejects(store.read(name), (error) => error.status === 404);
  }
  await store.remove("https://other.example/uploads/2e7de88b-bbcd-4919-957c-0a9ed224d546.webp");
  assert.equal(objects.size, 0);
  const denied = createImageStore({ bucket: "test", client: { async send() { throw Object.assign(new Error("denied"), { name: "AccessDenied" }); } } });
  await assert.rejects(denied.read("2e7de88b-bbcd-4919-957c-0a9ed224d546.webp"), { name: "AccessDenied" });
});
