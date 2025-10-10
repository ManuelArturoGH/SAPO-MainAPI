export class Attendance {
  constructor(
    private readonly _id: string | null,
    private _attendanceMachineID: number,
    private _userId: number,
    private _attendanceTime: Date,
    private _accessMode: string,
    private _attendanceStatus: string,
    private readonly _createdAt: Date = new Date(),
  ) {}

  static createNew(params: {
    attendanceMachineID: number;
    userId: number;
    attendanceTime: Date;
    accessMode: string;
    attendanceStatus: string;
  }): Attendance {
    return new Attendance(
      null,
      params.attendanceMachineID,
      params.userId,
      params.attendanceTime,
      params.accessMode,
      params.attendanceStatus,
      new Date(),
    );
  }

  get id(): string | null {
    return this._id;
  }
  get attendanceMachineID(): number {
    return this._attendanceMachineID;
  }
  get userId(): number {
    return this._userId;
  }
  get attendanceTime(): Date {
    return this._attendanceTime;
  }
  get accessMode(): string {
    return this._accessMode;
  }
  get attendanceStatus(): string {
    return this._attendanceStatus;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
}
