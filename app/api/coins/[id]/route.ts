
// Importing necessary types
import { NextResponse } from 'next/server';

export async function GET(params: Promise<{ id: string }>) {
    const { id } = await params;
    // Your remaining logic here
}
