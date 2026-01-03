import { NextRequest, NextResponse } from 'next/server';
import { getOptionExpirationDates } from '@/utils/futu/client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  console.log('--- Option Expiration Request ---');
  console.log('Symbol:', symbol);
  console.log('-------------------------------');

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol is required' },
      { status: 400 }
    );
  }

  try {
    const data = await getOptionExpirationDates(symbol);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Futu API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch option expiration dates' },
      { status: 500 }
    );
  }
}
