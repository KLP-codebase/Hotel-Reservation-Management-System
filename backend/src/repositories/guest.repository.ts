import { DbAdapter } from '../config/db';
import { BaseRepository } from './base.repository';

// ── Shape of a guest row returned FROM the database ───────────────
export interface Guest {
    guest_id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    created_at: Date;
}

// ── Shape of data allowed IN when CREATING a guest ────────────────
export interface CreateGuestDto {
    first_name: string;
    last_name: string;
    email?: string;   // ? means optional
    phone?: string;
}

// ── Shape of data allowed IN when UPDATING a guest ────────────────
export interface UpdateGuestDto {
    first_name?: string;  // all fields optional — you can update just one
    last_name?: string;
    email?: string;
    phone?: string;
}

// ── The repository class ──────────────────────────────────────────
export class GuestRepository extends BaseRepository<Guest, CreateGuestDto, UpdateGuestDto> {

    constructor(db: DbAdapter) {
        super(db);
    }

    // "Give me the SQL to fetch all guests"
    protected getFindAllSql(): string {
        return `SELECT * FROM guests ORDER BY created_at DESC`;
    }

    // "Give me the SQL to fetch ONE guest by ID"
    protected getFindByIdSql(): string {
        return `SELECT * FROM guests WHERE guest_id = $1`;
    }

    // "Give me the SQL to delete a guest" (we're doing hard delete for guests)
    protected getSoftDeleteSql(): string {
        return `DELETE FROM guests WHERE guest_id = $1`;
    }

    // "Give me the SQL + values to INSERT a new guest"
    protected buildInsertParams(dto: CreateGuestDto) {
        return {
            values: [dto.first_name, dto.last_name, dto.email ?? null, dto.phone ?? null],
            sql: `
        INSERT INTO guests (first_name, last_name, email, phone)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
        };
    }

    // "Give me the SQL + values to UPDATE an existing guest"
    protected buildUpdateParams(id: string, dto: UpdateGuestDto) {
        return {
            values: [dto.first_name, dto.last_name, dto.email, dto.phone, id],
            sql: `
        UPDATE guests SET
          first_name = COALESCE($1, first_name),
          last_name  = COALESCE($2, last_name),
          email      = COALESCE($3, email),
          phone      = COALESCE($4, phone)
        WHERE guest_id = $5
        RETURNING *
      `,
        };
    }

    // Public booking flow: reuse the guest with this email, or create one.
    // An existing guest is returned as ids only, so the public caller never
    // sees another person's stored name or phone number.
    async findOrCreateByEmail(
        dto: CreateGuestDto & { email: string },
    ): Promise<
        | { created: true; guest: Guest }
        | { created: false; guest: { id: string; guest_id: string } }
    > {
        const findExisting = async () => {
            const { rows } = await this.db.query<{ id: string; guest_id: string }>(
                `SELECT COALESCE(to_jsonb(guests)->>'id', guest_id::text) AS id, guest_id::text FROM guests WHERE LOWER(email) = LOWER($1) LIMIT 1`,
                [dto.email]
            );
            return rows[0] ?? null;
        };

        const existing = await findExisting();
        if (existing) return { created: false, guest: existing };

        try {
            const created = await this.create(dto);
            const guestObj = { ...created, id: (created as any).id || (created as any).guest_id };
            return { created: true, guest: guestObj };
        } catch (err) {
            // 23505 = unique_violation: someone created this email between our SELECT and INSERT
            if ((err as { code?: string })?.code === '23505') {
                const raced = await findExisting();
                if (raced) return { created: false, guest: raced };
            }
            throw err;
        }
    }

    // Extra: search by name / email / phone (not in BaseRepository — unique to guests)
    async search(query: string): Promise<Guest[]> {
        const term = `%${query.toLowerCase()}%`;
        const { rows } = await this.db.query<Guest>(
            `SELECT * FROM guests
       WHERE LOWER(first_name) LIKE $1
          OR LOWER(last_name)  LIKE $1
          OR LOWER(email)      LIKE $1
          OR phone             LIKE $1
       ORDER BY first_name, last_name
       LIMIT 20`,
            [term]
        );
        return rows;
    }
}
