import { DbAdapter } from '../config/db';

export interface LoginChallenge {
  challenge_id: string;
  user_account_id: string;
  auth_token: string;
  otp_code: string;
  ip_address: string | null;
  user_agent: string | null;
  status: 'PENDING' | 'APPROVED' | 'EXPIRED';
  expires_at: Date;
  created_at: Date;
  approved_at: Date | null;
  // Joined account details
  username?: string;
  account_type?: string;
  staff_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  branch_id?: string | null;
  branch_name?: string | null;
}

export class LoginChallengeRepository {
  constructor(private readonly db: DbAdapter) {}

  async create(
    userAccountId: string,
    authToken: string,
    otpCode: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const { rows } = await this.db.query<{ challenge_id: string }>(
      `INSERT INTO login_challenges (user_account_id, auth_token, otp_code, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING challenge_id`,
      [userAccountId, authToken, otpCode, ipAddress ?? null, userAgent ?? null, expiresAt],
    );
    return rows[0].challenge_id;
  }

  async findById(challengeId: string): Promise<LoginChallenge | null> {
    const { rows } = await this.db.query<LoginChallenge>(
      `SELECT lc.*, ua.username, ua.account_type, ua.staff_id,
              s.first_name, s.last_name, s.email, s.branch_id, b.branch_name
       FROM login_challenges lc
       JOIN user_accounts ua ON lc.user_account_id = ua.user_account_id
       JOIN staff s ON ua.staff_id = s.staff_id
       LEFT JOIN branches b ON s.branch_id = b.branch_id
       WHERE lc.challenge_id = $1`,
      [challengeId],
    );
    return rows[0] ?? null;
  }

  async findByToken(authToken: string): Promise<LoginChallenge | null> {
    const { rows } = await this.db.query<LoginChallenge>(
      `SELECT lc.*, ua.username, ua.account_type, ua.staff_id,
              s.first_name, s.last_name, s.email, s.branch_id, b.branch_name
       FROM login_challenges lc
       JOIN user_accounts ua ON lc.user_account_id = ua.user_account_id
       JOIN staff s ON ua.staff_id = s.staff_id
       LEFT JOIN branches b ON s.branch_id = b.branch_id
       WHERE lc.auth_token = $1`,
      [authToken],
    );
    return rows[0] ?? null;
  }

  async approve(challengeId: string): Promise<void> {
    await this.db.query(
      `UPDATE login_challenges
       SET status = 'APPROVED', approved_at = CURRENT_TIMESTAMP
       WHERE challenge_id = $1`,
      [challengeId],
    );
  }
}
