import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { get } from "node:https";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.argv[2] || "app");
const port = Number(process.argv[3] || 4173);
const host = "127.0.0.1";

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function send(response, status, body, type = "text/plain; charset=utf-8") {
  response.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
  });
  response.end(body);
}

function sendJson(response, status, data) {
  send(response, status, JSON.stringify(data), "application/json; charset=utf-8");
}

function fetchJson(url) {
  return new Promise((resolvePromise, reject) => {
    const request = get(url, { headers: { accept: "application/json" } }, (remoteResponse) => {
      let body = "";
      remoteResponse.setEncoding("utf8");
      remoteResponse.on("data", (chunk) => {
        body += chunk;
      });
      remoteResponse.on("end", () => {
        try {
          resolvePromise({
            ok: remoteResponse.statusCode >= 200 && remoteResponse.statusCode < 300,
            status: remoteResponse.statusCode || 500,
            data: JSON.parse(body || "{}"),
          });
        } catch {
          reject(new Error("Resposta invalida da consulta de CNPJ."));
        }
      });
    });
    request.setTimeout(12000, () => {
      request.destroy(new Error("Tempo limite excedido na consulta de CNPJ."));
    });
    request.on("error", reject);
  });
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);

  if (url.pathname.startsWith("/api/cnpj/")) {
    const cnpj = url.pathname.replace("/api/cnpj/", "").replace(/\D/g, "");
    if (cnpj.length !== 14) {
      sendJson(response, 400, { message: "Informe um CNPJ com 14 digitos." });
      return;
    }

    try {
      const providers = [`https://minhareceita.org/${cnpj}`, `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`];
      let lastResult = null;
      for (const provider of providers) {
        lastResult = await fetchJson(provider);
        if (lastResult.ok) break;
      }
      sendJson(response, lastResult?.status || 502, lastResult?.data || { message: "Falha ao consultar CNPJ." });
    } catch (error) {
      sendJson(response, 502, { message: error.message || "Falha ao consultar CNPJ." });
    }
    return;
  }

  const safePath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  let filePath = resolve(join(root, safePath === "/" ? "index.html" : safePath));

  if (!filePath.startsWith(root)) {
    send(response, 403, "Forbidden");
    return;
  }

  if (!existsSync(filePath)) {
    send(response, 404, "Not found");
    return;
  }

  if (statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }

  response.writeHead(200, {
    "content-type": types[extname(filePath)] || "application/octet-stream",
    "cache-control": "no-store",
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Serving ${root} at http://${host}:${port}/`);
});
