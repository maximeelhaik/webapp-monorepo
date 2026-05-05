import adjectifHandler from "../apps/adjectif/api/generate";
import worldHandler from "../apps/world/api/generate";
import constellationHandler from "../apps/constellation/api/generate";

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  let body: any = {};
  try {
    body = await req.clone().json();
  } catch (e) {}

  if (body.app === 'world') {
    return worldHandler(req);
  }
  if (body.app === 'constellation') {
    return constellationHandler(req);
  }
  return adjectifHandler(req);
}
