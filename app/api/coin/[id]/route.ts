import { NextResponse } from "next/server";
import { fetchCoinDataInternal } from "@/lib/fetchCoinDataInternal";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid coin ID" }, { status: 404 });
  }

  const data = await fetchCoinDataInternal(id);

  if (!data) {
    return NextResponse.json({ error: "Coin not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
