interface RouteContext {
  params: Promise<{
    fileName: string;
  }>;
}

const demoAudioFiles = new Set(["auto-bi-7842-recorded-statement.wav"]);

export async function GET(request: Request, context: RouteContext) {
  return serveDemoAudio(request, context, true);
}

export async function HEAD(request: Request, context: RouteContext) {
  return serveDemoAudio(request, context, false);
}

async function serveDemoAudio(request: Request, context: RouteContext, includeBody: boolean) {
  const { fileName } = await context.params;

  if (!demoAudioFiles.has(fileName)) {
    return new Response("Demo audio not found.", { status: 404 });
  }

  const assetResponse = await fetch(new URL(`/demo-audio/${fileName}`, request.url));

  if (!assetResponse.ok) {
    return new Response("Demo audio asset unavailable.", { status: 502 });
  }

  // Cloudflare static assets currently return 200 for Range requests here. The browser needs
  // byte-range responses to seek inside the preloaded demo WAV, so this low-volume pilot route
  // slices the committed sample audio until S3/R2 signed audio delivery is wired in.
  // TODO: Replace this route with S3/R2 audio delivery that natively supports byte ranges.
  const audioBuffer = await assetResponse.arrayBuffer();
  const totalBytes = audioBuffer.byteLength;
  const contentType = assetResponse.headers.get("content-type") || "audio/wav";
  const rangeHeader = request.headers.get("range");
  const baseHeaders = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
    "Content-Type": contentType
  };

  if (!rangeHeader) {
    return new Response(includeBody ? audioBuffer : null, {
      status: 200,
      headers: {
        ...baseHeaders,
        "Content-Length": String(totalBytes)
      }
    });
  }

  const range = parseByteRange(rangeHeader, totalBytes);

  if (!range) {
    return new Response(null, {
      status: 416,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes */${totalBytes}`
      }
    });
  }

  const chunk = audioBuffer.slice(range.start, range.end + 1);

  return new Response(includeBody ? chunk : null, {
    status: 206,
    headers: {
      ...baseHeaders,
      "Content-Length": String(chunk.byteLength),
      "Content-Range": `bytes ${range.start}-${range.end}/${totalBytes}`
    }
  });
}

function parseByteRange(rangeHeader: string, totalBytes: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());

  if (!match) {
    return null;
  }

  const [, rawStart, rawEnd] = match;

  if (!rawStart && !rawEnd) {
    return null;
  }

  if (!rawStart) {
    const suffixLength = Number(rawEnd);

    if (!Number.isInteger(suffixLength) || suffixLength <= 0) {
      return null;
    }

    return {
      start: Math.max(0, totalBytes - suffixLength),
      end: totalBytes - 1
    };
  }

  const start = Number(rawStart);
  const end = rawEnd ? Number(rawEnd) : totalBytes - 1;

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= totalBytes) {
    return null;
  }

  return {
    start,
    end: Math.min(end, totalBytes - 1)
  };
}
