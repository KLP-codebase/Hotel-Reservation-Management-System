import { DbAdapter } from '../config/db';
import { BaseRepository } from './base.repository';

export type RoomStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'MAINTENANCE'
  | 'OUT_OF_SERVICE';

export interface Room {
  room_id: number;
  branch_id: string;
  room_type_id: number;
  room_number: string;
  floor: number | null;
  status: RoomStatus;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRoomDto {
  branch_id: string;
  room_type_id: number;
  room_number: string;
  floor?: number;
  status?: RoomStatus;
}

export interface UpdateRoomDto {
  branch_id?: string;
  room_type_id?: number;
  room_number?: string;
  floor?: number;
  status?: RoomStatus;
  is_active?: boolean;
}

export class RoomRepository extends BaseRepository<
  Room,
  CreateRoomDto,
  UpdateRoomDto
> {
  constructor(db: DbAdapter) {
    super(db);
  }

  protected getFindAllSql(): string {
    return `
      SELECT
        r.*,
        b.branch_name,
        rt.type_name,
        rt.base_daily_rate,
        rt.capacity
      FROM rooms r
      LEFT JOIN branches b ON b.branch_id = r.branch_id
      LEFT JOIN room_types rt ON rt.room_type_id = r.room_type_id
      ORDER BY b.branch_name ASC, r.room_number ASC
    `;
  }

  protected getFindByIdSql(): string {
    return `
      SELECT
        r.*,
        b.branch_name,
        rt.type_name,
        rt.base_daily_rate,
        rt.capacity
      FROM rooms r
      LEFT JOIN branches b ON b.branch_id = r.branch_id
      LEFT JOIN room_types rt ON rt.room_type_id = r.room_type_id
      WHERE r.room_id = $1
    `;
  }

  protected getSoftDeleteSql(): string {
    return `
      UPDATE rooms
      SET
        is_active = false,
        updated_at = CURRENT_TIMESTAMP
      WHERE room_id = $1
    `;
  }

  protected buildInsertParams(
    dto: CreateRoomDto,
  ): { values: unknown[]; sql: string } {
    return {
      values: [
        dto.branch_id,
        dto.room_type_id,
        dto.room_number,
        dto.floor ?? null,
        dto.status ?? 'AVAILABLE',
      ],
      sql: `
        INSERT INTO rooms
          (branch_id, room_type_id, room_number, floor, status)
        VALUES
          ($1, $2, $3, $4, $5)
        RETURNING *
      `,
    };
  }

  protected buildUpdateParams(
    id: string,
    dto: UpdateRoomDto,
  ): { values: unknown[]; sql: string } {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (dto.branch_id !== undefined) {
      fields.push(`branch_id = $${i++}`);
      values.push(dto.branch_id);
    }

    if (dto.room_type_id !== undefined) {
      fields.push(`room_type_id = $${i++}`);
      values.push(dto.room_type_id);
    }

    if (dto.room_number !== undefined) {
      fields.push(`room_number = $${i++}`);
      values.push(dto.room_number);
    }

    if (dto.floor !== undefined) {
      fields.push(`floor = $${i++}`);
      values.push(dto.floor);
    }

    if (dto.status !== undefined) {
      fields.push(`status = $${i++}`);
      values.push(dto.status);
    }

    if (dto.is_active !== undefined) {
      fields.push(`is_active = $${i++}`);
      values.push(dto.is_active);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(id);

    return {
      values,
      sql: `
        UPDATE rooms
        SET ${fields.join(', ')}
        WHERE room_id = $${i}
        RETURNING *
      `,
    };
  }

  async findFiltered(filters: {
    branch_id?: string;
    room_type_id?: string;
    status?: RoomStatus;
    is_active?: boolean;
  }): Promise<Room[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (filters.branch_id !== undefined) {
      conditions.push(`r.branch_id = $${i++}`);
      values.push(filters.branch_id);
    }

    if (filters.room_type_id !== undefined) {
      conditions.push(`r.room_type_id = $${i++}`);
      values.push(filters.room_type_id);
    }

    if (filters.status !== undefined) {
      conditions.push(`r.status = $${i++}`);
      values.push(filters.status);
    }

    if (filters.is_active !== undefined) {
      conditions.push(`r.is_active = $${i++}`);
      values.push(filters.is_active);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

    const sql = `
      SELECT
        r.*,
        b.branch_name,
        rt.type_name,
        rt.base_daily_rate,
        rt.capacity
      FROM rooms r
      LEFT JOIN branches b ON b.branch_id = r.branch_id
      LEFT JOIN room_types rt ON rt.room_type_id = r.room_type_id
      ${whereClause}
      ORDER BY b.branch_name ASC, r.room_number ASC
    `;

    const { rows } = await this.db.query<Room>(sql, values);
    return rows;
  }

  async updateStatus(
    id: string,
    status: RoomStatus,
  ): Promise<Room | null> {
    const sql = `
      UPDATE rooms
      SET
        status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE room_id = $2
      RETURNING *
    `;

    const { rows } = await this.db.query<Room>(sql, [status, id]);
    return rows[0] ?? null;
  }

  // branchId limits the counts to one branch; omitted, it counts every branch.
  async getRoomCountsByRoomType(branchId?: string): Promise<Record<number, number>> {
    const sql = `
      SELECT room_type_id, COUNT(*)::int AS count
      FROM rooms
      WHERE is_active = true AND ($1::uuid IS NULL OR branch_id = $1::uuid)
      GROUP BY room_type_id
    `;
    const { rows } = await this.db.query<{ room_type_id: number; count: number }>(sql, [branchId ?? null]);
    const map: Record<number, number> = {};
    for (const r of rows) {
      map[r.room_type_id] = r.count;
    }
    return map;
  }
}