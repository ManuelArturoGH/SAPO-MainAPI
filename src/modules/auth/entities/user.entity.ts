export class User {
  constructor(
    private readonly _id: string | null,
    private _email: string,
    private _passwordHash: string,
    private _name: string,
    private _role: string,
    private _isActive: boolean,
    private readonly _createdAt: Date = new Date(),
  ) {}

  static createNew(
    email: string,
    passwordHash: string,
    name: string,
    role: string = 'user',
    isActive: boolean = true,
  ): User {
    return new User(
      null,
      email,
      passwordHash,
      name,
      role,
      isActive,
      new Date(),
    );
  }

  get id(): string | null {
    return this._id;
  }

  get email(): string {
    return this._email;
  }

  get passwordHash(): string {
    return this._passwordHash;
  }

  get name(): string {
    return this._name;
  }

  get role(): string {
    return this._role;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  toSafeObject() {
    return {
      id: this._id,
      email: this._email,
      name: this._name,
      role: this._role,
      isActive: this._isActive,
      createdAt: this._createdAt,
    };
  }
}
