export class Device {
  constructor(
    private readonly _id: string | null,
    private _ip: string,
    private _port: number,
    private _machineNumber: number,
    private readonly _createdAt: Date = new Date(),
  ) {}

  static createNew(ip: string, port: number, machineNumber: number): Device {
    return new Device(null, ip, port, machineNumber, new Date());
  }

  get id(): string | null {
    return this._id;
  }
  get ip(): string {
    return this._ip;
  }
  get port(): number {
    return this._port;
  }
  get machineNumber(): number {
    return this._machineNumber;
  }
  get createdAt(): Date {
    return this._createdAt;
  }

  update(
    data: Partial<{ ip: string; port: number; machineNumber: number }>,
  ): Device {
    if (data.ip !== undefined) this._ip = data.ip;
    if (data.port !== undefined) this._port = data.port;
    if (data.machineNumber !== undefined)
      this._machineNumber = data.machineNumber;
    return this;
  }
}
