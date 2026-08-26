export type AccountType =
  | 'GUEST'
  | 'RECEPTIONIST'
  | 'SERVICE_STAFF'
  | 'MANAGER'
  | 'ADMINISTRATOR'
  | 'DBA';

export interface JwtPayload {
  sub: string;          // user_account_id
  role: AccountType;
  branchId: string | null;
  iat?: number;
  exp?: number;
}

// ── GoF: Builder ──────────────────────────────────────────────────────────────
// Assembles a JwtPayload step by step.
// Enforces required fields at build() time rather than at call sites.
// New JWT fields (feature flags, permissions) are added as new setter methods.
export class JwtPayloadBuilder {
  private payload: Partial<JwtPayload> = {};

  setSubject(id: string): this {
    this.payload.sub = id;
    return this;
  }

  setRole(role: AccountType): this {
    this.payload.role = role;
    return this;
  }

  setBranch(branchId: string | null): this {
    this.payload.branchId = branchId;
    return this;
  }

  build(): JwtPayload {
    if (!this.payload.sub)  throw new Error('JwtPayloadBuilder: sub is required');
    if (!this.payload.role) throw new Error('JwtPayloadBuilder: role is required');
    return {
      sub:      this.payload.sub,
      role:     this.payload.role,
      branchId: this.payload.branchId ?? null,
    };
  }
}
