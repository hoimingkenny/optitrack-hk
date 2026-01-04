import ftWebsocket, { ftCmdID } from 'futu-api';
import { Qot_Common } from 'futu-api/proto.js';

const host = process.env.FUTU_OPEND_HOST || '127.0.0.1';
const port = parseInt(process.env.FUTU_OPEND_PORT || '33333');
const pwdMd5 = process.env.FUTU_PWD_MD5 || '';
const useSsl = process.env.FUTU_OPEND_SSL === 'true';

export interface OptionExpirationDate {
  strikeTime: string;
  optionExpiryDateDistance: number;
  expirationCycle: number;
}

export interface OptionChainItem {
  code: string;
  name: string;
  strikePrice: number;
  optionType: number; // 1 for Call, 2 for Put
  strikeTime: string;
  lotSize?: number;
  premium?: number;
  lastPrice?: number;
  bidPrice?: number;
  askPrice?: number;
  volume?: number;
  openInterest?: number;
  delta?: number;
  gamma?: number;
  vega?: number;
  theta?: number;
  rho?: number;
  impliedVolatility?: number;
}

export class FutuClient {
  private websocket: ftWebsocket;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private eventHandlers: Map<number | string, ((data: any) => void)[]> = new Map();

  constructor(h = host, p = port, enableSsl = useSsl) {
    this.websocket = new ftWebsocket();
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;
    if (this.connectionPromise) return this.connectionPromise;

    console.log('[FutuClient] Starting connection to Futu OpenD...');
    this.connectionPromise = new Promise((resolve, reject) => {
      let resolved = false;

      // Ensure we have a fresh websocket instance if previous one failed
      if (!this.websocket || (this.websocket as any).websock?.readyState > 1) {
        console.log('[FutuClient] Re-creating websocket instance');
        this.websocket = new ftWebsocket();
      }

      this.websocket.onlogin = (ret: boolean, msg: string) => {
        if (resolved) return;
        if (ret) {
          console.log('[FutuClient] Connected to Futu OpenD and logged in');
          this.isConnected = true;
          resolved = true;
          resolve();
        } else {
          console.error('[FutuClient] Futu login failed:', msg);
          this.connectionPromise = null;
          resolved = true;
          reject(new Error(msg));
        }
      };

      this.websocket.onPush = (cmd: number, data: any) => {
        const handlers = this.eventHandlers.get(cmd);
        if (handlers) {
          handlers.forEach(handler => handler(data));
        }
      };

      try {
        console.log(`[FutuClient] Connecting to ${host}:${port} (SSL: ${useSsl})...`);
        this.websocket.start(host, port, useSsl, pwdMd5);
      } catch (err) {
        console.error('[FutuClient] Error starting websocket:', err);
        this.connectionPromise = null;
        resolved = true;
        reject(err);
      }

      // Timeout
      setTimeout(() => {
        if (!resolved && !this.isConnected) {
          console.error('[FutuClient] Connection timeout');
          this.connectionPromise = null;
          resolved = true;
          reject(new Error('Futu connection timeout'));
        }
      }, 15000); // Increased timeout to 15s
    });

    return this.connectionPromise;
  }

  on(event: number | string, callback: (data: any) => void) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
  }

  // Get security snapshots (quote data)
  async getSecuritySnapshots(securities: { market: number, code: string }[]) {
    if (!this.isConnected) await this.connect();

    if (!securities || securities.length === 0) return [];

    const req = {
      c2s: {
        securityList: securities,
      },
    };

    try {
      const res = await this.websocket.GetSecuritySnapshot(req);
      if (res.retType !== 0) {
        console.error('[FutuClient] GetSecuritySnapshot API error:', res.retMsg);
        throw new Error(res.retMsg || 'Futu API error');
      }
      return res.s2c?.snapshotList || [];
    } catch (err) {
      console.error('[FutuClient] GetSecuritySnapshot error:', err);
      throw err;
    }
  }

  // Get static info for securities
  async getStaticInfo(securities: { market: number, code: string }[]) {
    if (!this.isConnected) await this.connect();

    if (!securities || securities.length === 0) return [];

    const req = {
      c2s: {
        securityList: securities,
      },
    };

    try {
      const res = await (this.websocket as any).GetStaticInfo(req);
      if (res.retType !== 0) {
        // Some codes might be invalid, but we should return valid ones if possible
        // Futu might return error if ANY code is invalid?
        // Usually it returns partial results or error.
        // If error, return empty.
        console.warn('[FutuClient] GetStaticInfo warning:', res.retMsg);
        return res.s2c?.staticInfoList || [];
      }
      return res.s2c?.staticInfoList || [];
    } catch (err) {
      console.error('[FutuClient] GetStaticInfo error:', err);
      return [];
    }
  }

  // Search stocks (Basic implementation)
  async searchStocks(query: string): Promise<{ market: number, code: string, name: string }[]> {
    if (!query) return [];
    
    // Normalize query
    const q = query.trim().toUpperCase();
    const results: { market: number, code: string, name: string }[] = [];
    const candidates: { market: number, code: string }[] = [];

    // 1. Numeric query: Try to pad to 5 digits
    if (/^\d+$/.test(q)) {
      // Direct match if 5 digits
      if (q.length === 5) {
        candidates.push({ market: 1, code: q });
      } else if (q.length < 5) {
        // Try padding with leading zeros to 5 digits
        const padded = q.padStart(5, '0');
        candidates.push({ market: 1, code: padded });
        
        // Also try suffix matches? E.g. "700" -> "00700"
        // If user types "70", maybe "00070"?
        // Let's just try the padded version for now.
        
        // If query is "70", padded is "00070".
        // Also try adding trailing zeros? "70000"?
        // Let's stick to standard HK stock format which is 5 digits, usually with leading zeros.
        
        // If user types "5", padded "00005" (HSBC).
        // If user types "700", padded "00700" (Tencent).
        
        // Maybe also search for stock codes *starting* with the query?
        // That requires a full list.
        // For now, just exact code match after padding.
      }
    } 
    
    // 2. Common HK Stocks (Hardcoded fallback for name search)
    const commonStocks = [
      { code: '00700', name: 'TENCENT' },
      { code: '09988', name: 'BABA-SW' },
      { code: '03690', name: 'MEITUAN-W' },
      { code: '00005', name: 'HSBC HOLDINGS' },
      { code: '01299', name: 'AIA' },
      { code: '00941', name: 'CHINA MOBILE' },
      { code: '00388', name: 'HKEX' },
      { code: '02318', name: 'PING AN' },
      { code: '01211', name: 'BYD COMPANY' },
      { code: '01810', name: 'XIAOMI-W' },
      { code: '00001', name: 'CKH HOLDINGS' },
      { code: '00016', name: 'SHK PPT' },
      { code: '00027', name: 'GALAXY ENT' },
      { code: '00066', name: 'MTR CORPORATION' },
      { code: '00883', name: 'CNOOC' },
      { code: '00939', name: 'CCB' },
      { code: '01398', name: 'ICBC' },
      { code: '03988', name: 'BANK OF CHINA' },
      { code: '09999', name: 'NETEASE-S' },
      { code: '09618', name: 'JD-SW' },
      { code: '01024', name: 'KUAISHOU-W' },
      { code: '09888', name: 'BIDU-SW' },
      { code: '02015', name: 'LI AUTO-W' },
      { code: '09868', name: 'XPENG-W' },
      { code: '09866', name: 'NIO-SW' },
    ];

    // Filter common stocks by name or code
    commonStocks.forEach(s => {
      if (s.code.includes(q) || s.name.includes(q)) {
        // Avoid duplicates if we already added via numeric check
        if (!candidates.find(c => c.code === s.code)) {
          candidates.push({ market: 1, code: s.code });
        }
      }
    });

    // Fetch details for candidates
    if (candidates.length > 0) {
      const staticInfos = await this.getStaticInfo(candidates);
      staticInfos.forEach((info: any) => {
        results.push({
          market: info.basic.security.market,
          code: info.basic.security.code,
          name: info.basic.name,
        });
      });
    }

    return results;
  }

  async getOptionExpirationDates(market: number, code: string): Promise<OptionExpirationDate[]> {
    if (!this.isConnected) await this.connect();

    if (!code) return [];

    const req = {
      c2s: {
        owner: {
          market,
          code,
        },
      },
    };

    console.log('[FutuClient] GetOptionExpirationDate request:', JSON.stringify(req, null, 2));
    const res = await this.websocket.GetOptionExpirationDate(req);
    console.log('[FutuClient] GetOptionExpirationDate response retType:', res.retType, 'retMsg:', res.retMsg);

    if (res.retType !== 0) {
      throw new Error(res.retMsg || 'Futu API error');
    }

    return res.s2c?.dateList || [];
  }

  async getOptionChain(
    market: number, 
    code: string, 
    start: string, 
    end: string,
    optionType?: number,
    optionCondType?: number,
    dataFilter?: {
      impliedVolatilityMin?: number;
      impliedVolatilityMax?: number;
      deltaMin?: number;
      deltaMax?: number;
      gammaMin?: number;
      gammaMax?: number;
      vegaMin?: number;
      vegaMax?: number;
      thetaMin?: number;
      thetaMax?: number;
      rhoMin?: number;
      rhoMax?: number;
      netOpenInterestMin?: number;
      netOpenInterestMax?: number;
      openInterestMin?: number;
      openInterestMax?: number;
      volMin?: number;
      volMax?: number;
    },
    skipSnapshots: boolean = false
  ): Promise<OptionChainItem[]> {
    if (!this.isConnected) await this.connect();

    if (!code) return [];

    const req: any = {
      c2s: {
        owner: {
          market,
          code,
        },
        beginTime: start,
        endTime: end,
      },
    };

    if (optionType !== undefined) req.c2s.optionType = optionType;
    if (optionCondType !== undefined) req.c2s.optionCondType = optionCondType;
    if (dataFilter) req.c2s.dataFilter = dataFilter;

    console.log('[FutuClient] GetOptionChain request:', JSON.stringify(req, null, 2));
    const res = await this.websocket.GetOptionChain(req);
    console.log('[FutuClient] GetOptionChain response retType:', res.retType, 'retMsg:', res.retMsg);
    
    if (res.retType !== 0) {
      throw new Error(res.retMsg || 'Futu API error');
    }

    if (res.s2c && res.s2c.optionChain) {
      const chain: OptionChainItem[] = [];
      const securityList: { market: number, code: string }[] = [];

      res.s2c.optionChain.forEach((group: any) => {
        group.option.forEach((item: any) => {
          if (item.call) {
            const code = item.call.basic.security.code;
            const market = item.call.basic.security.market;
            chain.push({
              code,
              name: item.call.basic.name,
              strikePrice: toNumber(item.call.optionExData?.strikePrice),
              optionType: 1, // Call
              strikeTime: group.strikeTime,
              lotSize: toNumber(item.call.basic.lotSize),
            });
            securityList.push({ market, code });
          }
          if (item.put) {
            const code = item.put.basic.security.code;
            const market = item.put.basic.security.market;
            chain.push({
              code,
              name: item.put.basic.name,
              strikePrice: toNumber(item.put.optionExData?.strikePrice),
              optionType: 2, // Put
              strikeTime: group.strikeTime,
              lotSize: toNumber(item.put.basic.lotSize),
            });
            securityList.push({ market, code });
          }
        });
      });

      // Fetch snapshots for dynamic data (premium, last price, etc.)
      if (securityList.length > 0 && !skipSnapshots) {
        try {
          // Limit snapshots to 400 at a time (OpenD limit is usually 400 or 1000 depending on version)
          const snapshots = await this.getSecuritySnapshots(securityList.slice(0, 400));
          const snapshotMap = new Map();
          snapshots.forEach((snap: any) => {
            snapshotMap.set(snap.basic.security.code, snap);
          });

          chain.forEach(item => {
            const snap = snapshotMap.get(item.code);
            if (snap) {
              item.lastPrice = toNumber(snap.basic.lastPrice);
              item.premium = toNumber(snap.basic.lastPrice); // In options context, last price is the premium
              
              item.bidPrice = toNumber(snap.basic.curBidPrice);
              item.askPrice = toNumber(snap.basic.curAskPrice);
              
              // Handle Long objects for volume and openInterest
              item.volume = toNumber(snap.basic.volume);
              item.openInterest = toNumber(snap.optionExData?.openInterest);

              item.delta = snap.optionExData?.delta;
              item.gamma = snap.optionExData?.gamma;
              item.vega = snap.optionExData?.vega;
              item.theta = snap.optionExData?.theta;
              item.rho = snap.optionExData?.rho;
              item.impliedVolatility = snap.optionExData?.impliedVolatility;
            }
          });
        } catch (err) {
          console.error('Error fetching snapshots for option chain:', err);
        }
      }

      return chain;
    }
    return [];
  }

  disconnect() {
    this.websocket.stop();
    this.isConnected = false;
    this.connectionPromise = null;
  }
}

// Helper to convert Futu's Long objects to numbers
export function toNumber(val: any): any {
  if (val === null || val === undefined) return val;
  if (typeof val === 'object' && 'low' in val && 'high' in val) {
    return val.low + val.high * 4294967296;
  }
  return val;
}

// Singleton instance
const globalClient = new FutuClient();

export default globalClient;

function getMarketFromSymbol(symbol: string): number {
  if (!symbol) return Qot_Common.QotMarket.QotMarket_HK_Security;
  
  const s = symbol.toUpperCase();
  
  // Handle HK.00700 or 00700.HK
  if (s.startsWith('HK.') || s.endsWith('.HK')) {
    return Qot_Common.QotMarket.QotMarket_HK_Security;
  }
  if (s.startsWith('US.') || s.endsWith('.US')) {
    return Qot_Common.QotMarket.QotMarket_US_Security;
  }
  // Also check if it's just a 5-digit code or includes HK/US in any way
  if (s.includes('HK')) return Qot_Common.QotMarket.QotMarket_HK_Security;
  if (s.includes('US')) return Qot_Common.QotMarket.QotMarket_US_Security;
  if (s.startsWith('SH.') || s.endsWith('.SH')) {
    return Qot_Common.QotMarket.QotMarket_SH_Security;
  }
  if (s.startsWith('SZ.') || s.endsWith('.SZ')) {
    return Qot_Common.QotMarket.QotMarket_SZ_Security;
  }
  
  // Guess based on format if no prefix/suffix
  if (/^\d+$/.test(symbol)) {
    return Qot_Common.QotMarket.QotMarket_HK_Security;
  }
  return Qot_Common.QotMarket.QotMarket_US_Security;
}

function getCodeFromSymbol(symbol: string): string {
  if (!symbol) return '';
  
  // Clean up symbol first
  let s = symbol.toUpperCase().trim();
  
  const marketPrefixes = ['HK', 'US', 'SH', 'SZ'];
  const parts = s.split('.');
  
  if (parts.length > 1) {
    // Check which part is the market and return the other
    if (marketPrefixes.includes(parts[0])) return parts[1];
    if (marketPrefixes.includes(parts[1])) return parts[0];
    
    // Fallback for numeric vs non-numeric
    if (/^\d+$/.test(parts[0]) && !/^\d+$/.test(parts[1])) return parts[0];
    if (/^\d+$/.test(parts[1]) && !/^\d+$/.test(parts[0])) return parts[1];
    
    return parts[0];
  }
  
  // If no dot, just remove market strings if they exist at start/end
  marketPrefixes.forEach(m => {
    if (s.startsWith(m)) s = s.substring(m.length);
    if (s.endsWith(m)) s = s.substring(0, s.length - m.length);
  });
  
  return s.replace(/[^0-9A-Z]/g, ''); // Final cleanup
}

export async function getOptionExpirationDates(symbol: string): Promise<OptionExpirationDate[]> {
  if (!symbol) return [];
  
  const market = getMarketFromSymbol(symbol);
  const code = getCodeFromSymbol(symbol);
  
  return globalClient.getOptionExpirationDates(market, code);
}

export async function getOptionChain(
  symbol: string, 
  start: string, 
  end: string,
  optionType?: number,
  optionCondType?: number,
  dataFilter?: any,
  skipSnapshots: boolean = false
): Promise<OptionChainItem[]> {
  if (!symbol) return [];
  
  const market = getMarketFromSymbol(symbol);
  const code = getCodeFromSymbol(symbol);
  
  return globalClient.getOptionChain(market, code, start, end, optionType, optionCondType, dataFilter, skipSnapshots);
}

export async function getQuote(symbol: string) {
  if (!symbol) return null;
  
  const market = getMarketFromSymbol(symbol);
  const code = getCodeFromSymbol(symbol);
  
  const snapshots = await globalClient.getSecuritySnapshots([{ market, code }]);
  return snapshots.length > 0 ? snapshots[0] : null;
}

export async function getSnapshots(symbols: string[]) {
  if (!symbols || symbols.length === 0) return [];
  
  const securities = symbols.map(s => ({
    market: getMarketFromSymbol(s),
    code: getCodeFromSymbol(s)
  }));
  
  return globalClient.getSecuritySnapshots(securities);
}
