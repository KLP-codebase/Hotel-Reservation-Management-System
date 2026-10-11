import { DbAdapter } from '../config/db';

export interface TrustedDevice {
  device_id: string;
  user_account_id: string;
  device_token_hash: string;
  device_name: string | null;
  ip_address: string | null;
  last_used_at: Date;
  expires_at: Date;
  created_at: Date;
}

export class TrustedDeviceRepository {
  constructor(private readonly db: DbAdapter) {}

  async findValidDevice(userAccountId: string, tokenHash: string): Promise<TrustedDevice | null> {
    const { rows } = await this.db.query<TrustedDevice>(
      `SELECT * FROM trusted_guest_devices
       WHERE user_account_id = $1 
         AND device_token_hash = $2 
         AND expires_at > CURRENT_TIMESTAMP
       LIMIT 1`,
      [userAccountId, tokenHash],
    );
    return rows[0] ?? null;
  }

  async registerDevice(
    userAccountId: string,
    tokenHash: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await this.db.query(
      `INSERT INTO trusted_guest_devices (user_account_id, device_token_hash, ip_address, device_name, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (device_token_hash) 
       DO UPDATE SET expires_at = $5, last_used_at = CURRENT_TIMESTAMP`,
      [userAccountId, tokenHash, ipAddress ?? null, userAgent ? userAgent.substring(0, 255) : null, expiresAt],
    );
  }

  async touchDevice(tokenHash: string): Promise<void> {
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.db.query(
      `UPDATE trusted_guest_devices
       SET last_used_at = CURRENT_TIMESTAMP, expires_at = $2
       WHERE device_token_hash = $1`,
      [tokenHash, newExpiresAt],
    );
  }

  async revokeDevice(tokenHash: string): Promise<void> {
    await this.db.query(
      `DELETE FROM trusted_guest_devices WHERE device_token_hash = $1`,
      [tokenHash],
    );
  }

  async revokeAllForUser(userAccountId: string): Promise<void> {
    await this.db.query(
      `DELETE FROM trusted_guest_devices WHERE user_account_id = $1`,
      [userAccountId],
    );
  }
}
