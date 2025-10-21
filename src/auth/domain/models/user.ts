export class User {
  constructor(
    private readonly _id: string | null,
    private _name: string,
    private _email: string,
    private _password: string,
    private readonly _createdAt: Date = new Date(),
  ) {}

  static createNew(name: string, email: string, password: string): User {
    return new User(null, name, email, password, new Date());
  }

  get id(): string | null {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  set name(name: string) {
    this._name = name;
  }

  get email(): string {
    return this._email;
  }

  set email(email: string) {
    this._email = email;
  }

  get password(): string {
    return this._password;
  }

  set password(password: string) {
    this._password = password;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  update(
    data: Partial<{ name: string; email: string; password: string }>,
  ): User {
    if (data.name !== undefined) this._name = data.name;
    if (data.email !== undefined) this._email = data.email;
    if (data.password !== undefined) this._password = data.password;
    return this;
  }
}
