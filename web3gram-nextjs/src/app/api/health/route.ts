export const dynamic = "force-dynamic";

export async function GET() {
  // Web3Gram messenger doesn't require PostgreSQL
  // Health check returns app status
  return Response.json({
    ok: true,
    app: "Web3Gram",
    timestamp: new Date().toISOString(),
  });
}
