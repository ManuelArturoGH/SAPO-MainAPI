export class Employee {
  // Constructor base (usado por repositorio y tests)
  constructor(
    private readonly _id: string | null,
    private _profile: string,
    private _name: string,
    private _isActive: boolean,
    private _department: string,
    private readonly _createdAt: Date = new Date(),
    private readonly _externalId?: number,
    private _position: string = 'sin asignar',
  ) {}
  // Fábrica para crear nuevos empleados (sin ID todavía)
  static createNew(
    name: string,
    department: string,
    isActive = true,
    position: string = 'sin asignar',
  ): Employee {
    return new Employee(
      null,
      '',
      name,
      isActive,
      department,
      new Date(),
      undefined,
      position || 'sin asignar',
    );
  }
  get id(): string | null {
    return this._id;
  }
  get name(): string {
    return this._name;
  }
  get isActive(): boolean {
    return this._isActive;
  }
  get department(): string {
    return this._department;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get externalId(): number | undefined {
    return this._externalId;
  }
  get position(): string {
    return this._position;
  }
  get profile(): string | undefined {
    return this._profile;
  }
  // Métodos de mutación controlada
  update(
    data: Partial<{
      name: string;
      department: string;
      isActive: boolean;
      position: string;
      profileImageUrl: string;
    }>,
  ): Employee {
    if (data.name !== undefined) this._name = data.name;
    if (data.department !== undefined) this._department = data.department;
    if (data.isActive !== undefined) this._isActive = data.isActive;
    if (data.position !== undefined && data.position.trim() !== '')
      this._position = data.position;
    if (data.profileImageUrl !== undefined)
      this._profile = data.profileImageUrl;
    return this;
  }
}
