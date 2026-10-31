import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.resolve(process.env.DATA_DIR ?? path.join(projectDirectory, "data"));
const rsvpFile = path.join(dataDirectory, "rsvps.json");
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";
const maximumRequestBytes = 8 * 1024;
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

let writeQueue = Promise.resolve();

function isWithinDirectory(directory, filePath) {
  const relativePath = path.relative(directory, filePath);
  return relativePath === ""
    || (relativePath !== ".."
      && !relativePath.startsWith(`..${path.sep}`)
      && !path.isAbsolute(relativePath));
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;
    let tooLarge = false;

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > maximumRequestBytes) {
        tooLarge = true;
      } else {
        body += chunk;
      }
    });
    request.on("end", () => {
      if (tooLarge) {
        reject(Object.assign(new Error("Request body is too large."), { statusCode: 413 }));
      } else {
        resolve(body);
      }
    });
    request.on("error", reject);
  });
}

function validateRsvp(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const name = typeof value.name === "string" ? value.name.trim() : "";
  const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const guests = value.guests;

  if (
    name.length === 0
    || name.length > 80
    || email.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || !Number.isInteger(guests)
    || guests < 1
    || guests > 4
  ) {
    return null;
  }

  return { name, email, guests };
}

async function readRsvps() {
  try {
    const saved = await readFile(rsvpFile, "utf8");
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      throw new Error("The RSVP data file must contain a JSON array.");
    }
    return parsed;
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function saveRsvp(rsvp) {
  const operation = writeQueue.then(async () => {
    await mkdir(dataDirectory, { recursive: true });
    const rsvps = await readRsvps();
    const existingIndex = rsvps.findIndex(
      (savedRsvp) => savedRsvp.email.toLowerCase() === rsvp.email,
    );
    const entry = { ...rsvp, submittedAt: new Date().toISOString() };

    if (existingIndex === -1) {
      rsvps.push(entry);
    } else {
      rsvps[existingIndex] = entry;
    }

    const temporaryFile = path.join(dataDirectory, `rsvps-${randomUUID()}.tmp`);
    await writeFile(temporaryFile, `${JSON.stringify(rsvps, null, 2)}\n`, { flag: "wx" });
    await rename(temporaryFile, rsvpFile);
  });

  writeQueue = operation.catch((error) => {
    console.error("Could not save an RSVP:", error);
  });
  return operation;
}

async function serveStaticFile(request, response, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    response.writeHead(400).end("Bad request");
    return;
  }

  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.slice(1);
  const filePath = path.resolve(projectDirectory, relativePath);
  if (!isWithinDirectory(projectDirectory, filePath)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  if (isWithinDirectory(dataDirectory, filePath)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      "Cache-Control": "no-cache",
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    if (request.method === "HEAD") {
      response.end();
    } else {
      response.end(content);
    }
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      response.writeHead(404).end("Not found");
      return;
    }
    console.error("Could not serve a project file:", error);
    response.writeHead(500).end("Could not serve this file");
  }
}

await mkdir(dataDirectory, { recursive: true });
try {
  await writeFile(rsvpFile, "[]\n", { flag: "wx" });
} catch (error) {
  if (error.code !== "EEXIST") throw error;
}
console.log("Wedding RSVP server starting");

const server = createServer(async (request, response) => {
  let requestUrl;
  try {
    requestUrl = new URL(request.url, "http://localhost");
  } catch {
    response.writeHead(400).end("Bad request");
    return;
  }

  if (requestUrl.pathname === "/api/rsvp") {
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      sendJson(response, 405, { error: "Use POST to submit an RSVP." });
      return;
    }

    const contentType = request.headers["content-type"]?.split(";")[0].trim().toLowerCase();
    if (contentType !== "application/json") {
      sendJson(response, 415, { error: "Submit the RSVP as JSON." });
      return;
    }

    try {
      const requestBody = await readRequestBody(request);
      let payload;
      try {
        payload = JSON.parse(requestBody);
      } catch {
        sendJson(response, 400, { error: "The RSVP could not be read. Please try again." });
        return;
      }

      const rsvp = validateRsvp(payload);
      if (!rsvp) {
        sendJson(response, 400, { error: "Please enter a valid name, email, and guest count." });
        return;
      }

      await saveRsvp(rsvp);
      sendJson(response, 201, { saved: true });
    } catch (error) {
      if (error.statusCode === 413) {
        sendJson(response, 413, { error: "The RSVP is too large to save." });
        return;
      }
      console.error("Could not save the RSVP request:", error);
      sendJson(response, 500, { error: "We couldn’t save your RSVP just now. Please try again." });
    }
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end("Method not allowed");
    return;
  }

  await serveStaticFile(request, response, requestUrl.pathname);
});

server.listen(port, host, () => {
  console.log(`Wedding RSVP server listening at http://localhost:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close((error) => {
      if (error) {
        console.error("Could not shut down the RSVP server cleanly:", error);
        process.exitCode = 1;
      }
    });
  });
}
