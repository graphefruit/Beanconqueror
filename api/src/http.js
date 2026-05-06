function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  response.end(body);
}

function sendNoContent(response) {
  response.writeHead(204);
  response.end();
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let length = 0;

    request.on('data', (chunk) => {
      chunks.push(chunk);
      length += chunk.length;
      if (length > 20 * 1024 * 1024) {
        reject(new Error('Request body too large'));
        request.destroy();
      }
    });

    request.on('end', () => {
      if (length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(error);
      }
    });

    request.on('error', reject);
  });
}

function applyCors(request, response, allowedOrigins) {
  const origin = request.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }

  response.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,DELETE,OPTIONS',
  );
  response.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Beanconqueror-Api-Token',
  );
}

module.exports = { applyCors, readJson, sendJson, sendNoContent };
