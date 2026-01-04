import { NextRequest, NextResponse } from 'next/server';
import { getSnapshots, toNumber } from '@/utils/futu/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols } = body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Symbols array is required' },
        { status: 400 }
      );
    }

    const snapshots = await getSnapshots(symbols);
    
    // Clean up Long objects to numbers
    const cleanedSnapshots = snapshots.map((snap: any) => cleanFutuObject(snap));

    return NextResponse.json({ snapshots: cleanedSnapshots });
  } catch (error: any) {
    console.error('[Snapshot API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch snapshots' },
      { status: 500 }
    );
  }
}

function cleanFutuObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(cleanFutuObject);
  }
  
  if (typeof obj === 'object') {
    // Check if it's a Long (protobufjs Long structure usually has low/high/unsigned)
    if ('low' in obj && 'high' in obj) {
      return toNumber(obj);
    }
    
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = cleanFutuObject(obj[key]);
      }
    }
    return newObj;
  }
  
  return obj;
}
