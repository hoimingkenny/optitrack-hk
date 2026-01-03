import { NextRequest, NextResponse } from 'next/server';
import globalClient from '@/utils/futu/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query) {
      return NextResponse.json([]);
    }

    const results = await globalClient.searchStocks(query);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error searching stocks:', error);
    return NextResponse.json({ error: 'Failed to search stocks' }, { status: 500 });
  }
}
