import { NextResponse } from "next/server";
import { fetchCoinDataInternal } from "@/lib/fetchCoinDataInternal";
import { httpRequestsTotal, httpRequestDuration, activeRequests } from "@/lib/metrics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const route = "/api/coin/[id]";
  const method = "GET";

  activeRequests.inc();
  const endTimer = httpRequestDuration.startTimer({ method, route });

  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    httpRequestsTotal.inc({ method, route, status_code: "404" });
    endTimer({ method, route, status_code: "404" });
    activeRequests.dec();
    return NextResponse.json({ error: "Invalid coin ID" }, { status: 404 });
  }

  const data = await fetchCoinDataInternal(id);

  if (!data) {
    httpRequestsTotal.inc({ method, route, status_code: "404" });
    endTimer({ method, route, status_code: "404" });
    activeRequests.dec();
    return NextResponse.json({ error: "Coin not found" }, { status: 404 });
  }

  httpRequestsTotal.inc({ method, route, status_code: "200" });
  endTimer({ method, route, status_code: "200" });
  activeRequests.dec();
  return NextResponse.json(data);
}