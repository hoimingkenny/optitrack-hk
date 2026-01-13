import { NextResponse } from 'next/server';
import { getSecurityKL } from '@/utils/futu/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, klType = 2, limit = 1000 } = body;

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }

    const data = await getSecurityKL(symbol, klType, 1, limit);
    
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error fetching KL data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch KL data' },
      { status: 500 }
    );
  }
}
