import { Request, Response, NextFunction } from 'express';
import { Errors } from './errors';

// A MANAGER runs exactly one branch (the one in their JWT). Administrators and
// DBAs work across every branch, so these helpers leave them unrestricted.

/** The manager's own branch, or undefined for roles that may see every branch. */
export function managerBranch(req: Request): string | undefined {
  if (req.user?.role !== 'MANAGER') return undefined;
  if (!req.user.branchId) throw Errors.forbidden('Your account is not assigned to a branch');
  return req.user.branchId;
}

/**
 * Refuses a manager acting on a record outside their branch. A null branch is a
 * chain-wide record: managers may read it but not change it.
 */
export function assertManagerOwns(req: Request, branchId: string | null | undefined): void {
  const own = managerBranch(req);
  if (own && String(branchId ?? '') !== own) {
    throw Errors.forbidden(branchId ? 'This record belongs to another branch' : 'Chain-wide records can only be changed by an administrator');
  }
}

/** Middleware: pins `?branchId=` to the manager's branch on report-style routes. */
export function lockManagerBranchQuery(req: Request, _res: Response, next: NextFunction): void {
  try {
    const own = managerBranch(req);
    if (own) req.query.branchId = own;
    next();
  } catch (err) {
    next(err);
  }
}
