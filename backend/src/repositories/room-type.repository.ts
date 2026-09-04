import { DbAdapter } from '../config/db';
import { BaseRepository } from './base.repository';

export interface RoomType {
  room_type_id: number;
  type_name: string;
  base_daily_rate: number;
  capacity: number;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRoomTypeDto {
  type_name: string;
  base_daily_rate: number;
  capacity: number;
  description?: string;
}

export interface UpdateRoomTypeDto {
  type_name?: string;
  base_daily_rate?: number;
  capacity?: number;
  description?: string;
}

export class RoomTypeRepository extends BaseRepository<
  RoomType,
  CreateRoomTypeDto,
  UpdateRoomTypeDto
> {
  constructor(db: DbAdapter) {
    super(db);
  }

  protected getFindAllSql(): string {
    return `
      SELECT *
      FROM room_types
      ORDER BY type_name ASC
    `;
  }

  protected getFindByIdSql(): string {
    return `
      SELECT *
      FROM room_types
      WHERE room_type_id = $1
    `;
  }

  protected getSoftDeleteSql(): string {
    throw new Error('Room types are not soft-deleted');
  }

  protected buildInsertParams(
    dto: CreateRoomTypeDto,
  ): { values: unknown[]; sql: string } {
    return {
      values: [
        dto.type_name,
        dto.base_daily_rate,
        dto.capacity,
        dto.description ?? null,
      ],
      sql: `
        INSERT INTO room_types
          (type_name, base_daily_rate, capacity, description)
        VALUES
          ($1, $2, $3, $4)
        RETURNING *
      `,
    };
  }

  protected buildUpdateParams(
    id: string,
    dto: UpdateRoomTypeDto,
  ): { values: unknown[]; sql: string } {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (dto.type_name !== undefined) {
      fields.push(`type_name = $${i++}`);
      values.push(dto.type_name);
    }

    if (dto.base_daily_rate !== undefined) {
      fields.push(`base_daily_rate = $${i++}`);
      values.push(dto.base_daily_rate);
    }

    if (dto.capacity !== undefined) {
      fields.push(`capacity = $${i++}`);
      values.push(dto.capacity);
    }

    if (dto.description !== undefined) {
      fields.push(`description = $${i++}`);
      values.push(dto.description);
    }

    values.push(id);

    return {
      values,
      sql: `
        UPDATE room_types
        SET ${fields.join(', ')}
        WHERE room_type_id = $${i}
        RETURNING *
      `,
    };
  }
}