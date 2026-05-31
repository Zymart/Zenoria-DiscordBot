import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { config } from "../config.js";

let supabaseClient;

function getStorageClient() {
  if (!isStorageConfigured()) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(config.storage.supabaseUrl, config.storage.supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return supabaseClient.storage.from(config.storage.bucket);
}

export function isStorageConfigured() {
  return Boolean(config.storage.supabaseUrl && config.storage.supabaseKey && config.storage.bucket);
}

function requireStorageBucket() {
  const bucket = getStorageClient();

  if (!bucket) {
    throw new Error("Supabase Storage is not configured. Fill SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.");
  }

  return bucket;
}

function cleanPathPart(value, fallback) {
  const cleaned = String(value || fallback)
    .replace(/^SPOILER_/i, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || fallback;
}

function createStoragePath({ guildId, userId, folder, fileName }) {
  const safeFolder = cleanPathPart(folder, "uploads");
  const safeGuildId = cleanPathPart(guildId, "guild");
  const safeUserId = cleanPathPart(userId, "user");
  const safeFileName = cleanPathPart(fileName, "upload.bin");
  const uniqueName = `${Date.now()}-${randomUUID()}-${safeFileName}`;

  return `${safeGuildId}/${safeFolder}/${safeUserId}/${uniqueName}`;
}

function normalizeStoragePath(value) {
  return String(value || "")
    .trim()
    .replace(/^copy name:\s*/i, "")
    .replace(/^`|`$/g, "")
    .replace(/^\/+/, "");
}

async function fetchAttachmentBuffer(attachment) {
  const response = await fetch(attachment.url);

  if (!response.ok) {
    throw new Error(`Could not download Discord attachment (${response.status}).`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function createAccessibleUrl(bucket, path) {
  if (config.storage.publicBucket) {
    const { data } = bucket.getPublicUrl(path);
    return data.publicUrl;
  }

  const { data, error } = await bucket.createSignedUrl(path, config.storage.signedUrlExpiresIn);
  if (error) throw error;

  return data.signedUrl;
}

function createStorageMetadata(attachment, options) {
  return Object.fromEntries(
    Object.entries({
      discordAttachmentId: attachment.id,
      discordAttachmentName: attachment.name,
      discordAttachmentSize: attachment.size,
      uploadedBy: options.userId,
      guildId: options.guildId
    })
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  );
}

export async function uploadDiscordAttachment(attachment, options = {}) {
  const bucket = requireStorageBucket();

  const path = createStoragePath({
    guildId: options.guildId,
    userId: options.userId,
    folder: options.folder,
    fileName: options.fileName ?? attachment.name
  });
  const body = await fetchAttachmentBuffer(attachment);

  const { data, error } = await bucket.upload(path, body, {
    contentType: attachment.contentType ?? "application/octet-stream",
    upsert: false,
    metadata: createStorageMetadata(attachment, options)
  });

  if (error) throw error;

  return {
    bucket: config.storage.bucket,
    path: data.path,
    url: await createAccessibleUrl(bucket, data.path)
  };
}

function fileDisplayName(storagePath) {
  return safeLocalFileName(storagePath.split("/").at(-1), "download.bin");
}

async function listFolder(bucket, folder, files, options) {
  const pageSize = 1000;
  let offset = 0;

  while (files.length < options.maxFilesToScan) {
    const { data, error } = await bucket.list(folder, {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" }
    });

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const item of data) {
      const itemPath = folder ? `${folder}/${item.name}` : item.name;

      if (item.id === null) {
        await listFolder(bucket, itemPath, files, options);
        continue;
      }

      files.push({
        name: fileDisplayName(itemPath),
        path: itemPath,
        size: item.metadata?.size,
        contentType: item.metadata?.mimetype,
        updatedAt: item.updated_at
      });

      if (files.length >= options.maxFilesToScan) break;
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }
}

export async function listSavedFiles(options = {}) {
  const bucket = requireStorageBucket();
  const guildPrefix = cleanPathPart(options.guildId, "guild");
  const files = [];

  await listFolder(bucket, guildPrefix, files, {
    maxFilesToScan: Math.max(options.limit ?? 25, 1000)
  });

  const search = String(options.search || "").trim().toLowerCase();
  const filteredFiles = search
    ? files.filter((file) =>
      file.name.toLowerCase().includes(search) ||
      file.path.toLowerCase().includes(search)
    )
    : files;

  return filteredFiles
    .sort((left, right) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")))
    .slice(0, options.limit ?? 25);
}

export async function resolveSavedFilePath(filename, options = {}) {
  const normalizedPath = normalizeStoragePath(filename);

  if (!normalizedPath) {
    throw new Error("File name is required.");
  }

  if (normalizedPath.includes("/")) {
    return normalizedPath;
  }

  const matches = (await listSavedFiles({
    guildId: options.guildId,
    search: normalizedPath,
    limit: 100
  })).filter((file) => file.name === normalizedPath);

  if (matches.length === 1) {
    return matches[0].path;
  }

  if (matches.length > 1) {
    throw new Error("More than one saved file has that name. Use the full copy name from /savedlist.");
  }

  throw new Error("I could not find that saved file. Use /savedlist and copy the full name shown there.");
}

export async function downloadStorageFile(storagePath, options = {}) {
  const bucket = requireStorageBucket();
  const resolvedPath = await resolveSavedFilePath(storagePath, options);
  const { data, error } = await bucket.download(resolvedPath);

  if (error) throw error;

  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    path: resolvedPath,
    name: fileDisplayName(resolvedPath),
    buffer,
    bytes: buffer.byteLength
  };
}

function safeLocalFileName(value, fallback) {
  const cleaned = path.basename(String(value || fallback))
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || fallback;
}

function localPathForDownload(storagePath, fileName) {
  const root = path.resolve(config.storage.localDirectory);
  const fallbackName = safeLocalFileName(storagePath.split("/").at(-1), "download.bin");
  const safeName = safeLocalFileName(fileName, fallbackName);
  const destination = path.resolve(root, safeName);

  if (!destination.startsWith(`${root}${path.sep}`) && destination !== root) {
    throw new Error("Invalid local file name.");
  }

  return { root, destination };
}

export async function downloadStorageFileToLocal(storagePath, options = {}) {
  const downloadedFile = await downloadStorageFile(storagePath, options);
  const { root, destination } = localPathForDownload(downloadedFile.path, options.fileName);

  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(destination, downloadedFile.buffer);

  return {
    path: downloadedFile.path,
    localPath: destination,
    bytes: downloadedFile.bytes
  };
}
