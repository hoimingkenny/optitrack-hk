import { NextRequest, NextResponse } from 'next/server';
import { getQuote, toNumber } from '@/utils/futu/client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol parameter is required' },
      { status: 400 }
    );
  }

  try {
    const quote = await getQuote(symbol);
    
    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    // Defensive check for nested properties
    // In snapshots, the price is often curPrice or lastPrice
    let lastPrice = quote.basic ? toNumber(quote.basic.curPrice || quote.basic.lastPrice) : null;
    const name = quote.basic ? quote.basic.name : 'Unknown';

    if (lastPrice === null || lastPrice === undefined) {
      return NextResponse.json(
        { error: 'Price information not available' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      price: lastPrice,
      name: name,
      symbol: symbol
    });
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : (typeof error === 'object' ? (error.retMsg || JSON.stringify(error)) : String(error));
    console.error('[Quote API] Error:', errorMsg);
    return NextResponse.json(
      { 
        error: errorMsg || 'Failed to fetch quote'
      },
      { status: 500 }
    );
  }
}
