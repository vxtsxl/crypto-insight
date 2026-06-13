import { NextResponse } from 'next/server';
import { fetchCoinDataInternal } from '@/lib/fetchCoinDataInternal';
import { httpRequestsTotal, httpRequestDuration, activeRequests } from '@/lib/metrics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const route = '/api/coin/[id]';
  const method = 'GET';

  activeRequests.inc();
  const endTimer = httpRequestDuration.startTimer({ method, route });

  try {
    const data = await fetchCoinDataInternal(id);

    if (!data) {
      httpRequestsTotal.inc({ method, route, status_code: '404' });
      endTimer({ method, route, status_code: '404' });
      activeRequests.dec();
      return NextResponse.json({ error: 'Coin not found' }, { status: 404 });
    }

    httpRequestsTotal.inc({ method, route, status_code: '200' });
    endTimer({ method, route, status_code: '200' });
    activeRequests.dec();
    return NextResponse.json(data);

  } catch (error) {
    console.error(`[api/coin/${id}] Unexpected error:`, error);
    httpRequestsTotal.inc({ method, route, status_code: '500' });
    endTimer({ method, route, status_code: '500' });
    activeRequests.dec();
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}