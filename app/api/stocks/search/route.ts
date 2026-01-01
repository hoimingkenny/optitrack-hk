import { NextRequest, NextResponse } from 'next/server';
import { searchStocks } from '@/db/repositories/stocks';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query) {
      return NextResponse.json([]);
    }

    const stocks = await searchStocks(query);
    return NextResponse.json(stocks);
  } catch (error) {
    console.error('Error searching stocks:', error);
    return NextResponse.json({ error: 'Failed to search stocks' }, { status: 500 });
  }
}
