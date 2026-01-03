import { NextRequest, NextResponse } from 'next/server';
import { getOptionChain } from '@/utils/futu/client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const optionType = searchParams.get('optionType');
  const optionCondType = searchParams.get('optionCondType');
  const skipSnapshots = searchParams.get('skipSnapshots') === 'true';
  
  // Data filters
  const dataFilter: any = {};
  const filterParams = [
    'impliedVolatilityMin', 'impliedVolatilityMax',
    'deltaMin', 'deltaMax',
    'gammaMin', 'gammaMax',
    'vegaMin', 'vegaMax',
    'thetaMin', 'thetaMax',
    'rhoMin', 'rhoMax',
    'netOpenInterestMin', 'netOpenInterestMax',
    'openInterestMin', 'openInterestMax',
    'volMin', 'volMax'
  ];

  filterParams.forEach(param => {
    const value = searchParams.get(param);
    if (value !== null) {
      dataFilter[param] = parseFloat(value);
    }
  });

  console.log('--- Option Chain Request ---');
  console.log('Symbol:', symbol);
  console.log('Start Date:', start);
  console.log('End Date:', end);
  console.log('Option Type:', optionType);
  console.log('Option Cond Type:', optionCondType);
  console.log('Data Filter:', dataFilter);
  console.log('---------------------------');

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol parameter is required' },
      { status: 400 }
    );
  }

  if (!start || !end) {
    return NextResponse.json(
      { error: 'Start and End date parameters are required' },
      { status: 400 }
    );
  }

  try {
    const data = await getOptionChain(
      symbol, 
      start, 
      end, 
      optionType ? parseInt(optionType) : undefined,
      optionCondType ? parseInt(optionCondType) : undefined,
      Object.keys(dataFilter).length > 0 ? dataFilter : undefined,
      skipSnapshots
    );
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching option chain:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch option chain' },
      { status: 500 }
    );
  }
}
