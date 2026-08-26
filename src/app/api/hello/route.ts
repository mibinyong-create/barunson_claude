import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name') ?? 'world';

  return Response.json({
    message: `Hello, ${name}!`,
    method: 'GET',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const { name } = (body ?? {}) as { name?: string };

  if (!name) {
    return Response.json(
      { error: '"name" is required' },
      { status: 400 },
    );
  }

  return Response.json(
    {
      message: `Hello, ${name}!`,
      method: 'POST',
      timestamp: new Date().toISOString(),
    },
    { status: 201 },
  );
}
