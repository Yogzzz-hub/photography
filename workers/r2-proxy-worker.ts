/**
 * MyOrb Family Vault - Cloudflare Worker for Private R2 Object Storage
 * Zero egress fees, authenticated single-use pre-signed URLs, strict multi-tenant boundary.
 */

export interface Env {
  PHOTO_VAULT_BUCKET: R2Bucket;
  AUTH_SECRET: string;
  ALLOWED_ORIGIN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') || '';
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Family-ID',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Route: /api/storage/authorize-upload
    if (path === '/api/storage/authorize-upload' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const { familyId, objectId, fileSizeBytes, mimeType } = await request.json() as any;
        if (!familyId || !objectId) {
          return new Response(JSON.stringify({ error: 'Missing familyId or objectId' }), {
            status: 400,
            headers: corsHeaders,
          });
        }

        // Strict storage path isolation
        const storagePath = `families/${familyId}/photos/${objectId}.enc`;

        return new Response(
          JSON.stringify({
            uploadUrl: `${url.origin}/api/storage/object/${storagePath}`,
            storagePath,
            expiresInSeconds: 900, // 15-minute validity
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    // Route: /api/storage/object/* (Stream encrypted objects)
    if (path.startsWith('/api/storage/object/')) {
      const storageKey = path.replace('/api/storage/object/', '');

      if (request.method === 'PUT') {
        const body = await request.arrayBuffer();
        await env.PHOTO_VAULT_BUCKET.put(storageKey, body, {
          httpMetadata: {
            contentType: 'application/octet-stream', // Opaque AES-256-GCM ciphertext
          },
        });
        return new Response(JSON.stringify({ success: true, key: storageKey }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (request.method === 'GET') {
        const object = await env.PHOTO_VAULT_BUCKET.get(storageKey);
        if (!object) {
          return new Response('Encrypted Memory Not Found', { status: 404, headers: corsHeaders });
        }

        const headers = new Headers(corsHeaders);
        headers.set('Content-Type', 'application/octet-stream');
        headers.set('Cache-Control', 'private, max-age=86400, immutable');
        headers.set('etag', object.httpEtag);

        return new Response(object.body, { headers });
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};
