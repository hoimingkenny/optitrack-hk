declare module 'futu-api' {
  export const ftCmdID: {
    [key: string]: {
      cmd: number;
      name: string;
      description: string;
    };
  };
  export default class ftWebsocket {
    constructor();
    onlogin: (ret: boolean, msg: string) => void;
    onPush: (cmd: number, res: any) => void;
    on(event: string | number, callback: (data: any) => void): void;
    connect(): void;
    start(ip: string, port: number, ssl: boolean, key?: string | null): void;
    stop(): void;
    close(): void;
    GetSecuritySnapshot(req: any): Promise<any>;
    GetOptionExpirationDate(req: any): Promise<any>;
    GetOptionChain(req: any): Promise<any>;
    // Add other methods as needed
  }
}

declare module 'futu-api/proto.js' {
  export const Qot_Common: any;
  export const Common: any;
}
