import http from "node:http";

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);

  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body)
  });
  response.end(body);
}

export function startHealthServer(client) {
  const port = Number.parseInt(process.env.PORT ?? "10000", 10);
  const startedAt = Date.now();

  const server = http.createServer((request, response) => {
    if (request.url === "/" || request.url === "/health") {
      sendJson(response, 200, {
        ok: true,
        bot: client.user?.tag ?? null,
        ready: Boolean(client.isReady?.()),
        uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000)
      });
      return;
    }

    sendJson(response, 404, {
      ok: false,
      error: "Not found"
    });
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`Health server listening on port ${port}`);
  });

  return server;
}
