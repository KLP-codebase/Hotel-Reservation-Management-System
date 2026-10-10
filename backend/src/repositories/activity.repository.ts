import { DbAdapter } from '../config/db';

export interface ActivityStay {
  archiveId: string;
  bookingId: string;
  bookingRef: string;
  branchName: string;
  roomTypeName: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPaid: number;
  loyaltyPoints: number;
  status: string;
  services: Array<{
    serviceName: string;
    category: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    usedAt: string;
  }>;
  isArchived: boolean;
}

export interface GuestActivityResponse {
  guest: {
    guestId: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  stats: {
    totalPoints: number;
    totalSpent: number;
    totalStays: number;
    loyaltyTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  };
  bookings: ActivityStay[];
}

export class ActivityRepository {
  constructor(private readonly db: DbAdapter) {}

  /**
   * Resolves guest_id for the authenticated user_account with 3-tier fallback:
   * Tier 1: user_accounts.guest_id
   * Tier 2: Email join staff -> guests
   * Tier 3: Provision guest record if not yet created
   */
  async resolveGuestId(userAccountId: string): Promise<{ guestId: string; firstName: string; lastName: string; email: string }> {
    // 1. Direct link on user_accounts
    const { rows: direct } = await this.db.query<{
      guest_id: string;
      first_name: string;
      last_name: string;
      email: string;
    }>(
      `SELECT ua.guest_id, s.first_name, s.last_name, s.email
       FROM user_accounts ua
       JOIN staff s ON s.staff_id = ua.staff_id
       WHERE ua.user_account_id = $1 AND ua.guest_id IS NOT NULL`,
      [userAccountId]
    );

    if (direct.length > 0 && direct[0].guest_id) {
      return {
        guestId: direct[0].guest_id,
        firstName: direct[0].first_name,
        lastName: direct[0].last_name,
        email: direct[0].email,
      };
    }

    // 2. Fetch user details and check matching guest by email
    const { rows: userInfo } = await this.db.query<{
      first_name: string;
      last_name: string;
      email: string;
    }>(
      `SELECT s.first_name, s.last_name, s.email
       FROM user_accounts ua
       JOIN staff s ON s.staff_id = ua.staff_id
       WHERE ua.user_account_id = $1`,
      [userAccountId]
    );

    if (!userInfo.length) {
      throw new Error('User account not found');
    }

    const { first_name, last_name, email } = userInfo[0];

    // Check guests table
    const { rows: matchedGuest } = await this.db.query<{ id: string }>(
      `SELECT id FROM guests WHERE LOWER(email::text) = LOWER($1::text) LIMIT 1`,
      [email]
    );

    let guestId: string;

    if (matchedGuest.length > 0 && matchedGuest[0].id) {
      guestId = matchedGuest[0].id;
    } else {
      // 3. Provision new guest record
      const generatedId = `GST-${Date.now().toString(36).toUpperCase()}`;
      const { rows: newGuest } = await this.db.query<{ id: string }>(
        `INSERT INTO guests (id, first_name, last_name, email, loyalty_tier, loyalty_points, total_stays)
         VALUES ($1, $2, $3, $4, 'BRONZE', 0, 0)
         RETURNING id`,
        [generatedId, first_name, last_name, email]
      );
      guestId = newGuest[0].id;
    }

    // Save guest_id back to user_accounts for fast future lookups
    await this.db.query(
      `UPDATE user_accounts SET guest_id = $1 WHERE user_account_id = $2`,
      [guestId, userAccountId]
    );

    return { guestId, firstName: first_name, lastName: last_name, email };
  }

  /**
   * Retrieves guest activity, compressed archive stays, live bookings, and calculates loyalty points
   */
  async getGuestActivity(userAccountId: string): Promise<GuestActivityResponse> {
    const guest = await this.resolveGuestId(userAccountId);
    const guestId = guest.guestId;

    // 1. Fetch from compressed archive
    const { rows: archivedRows } = await this.db.query<{
      archive_id: string;
      booking_id: string;
      booking_ref: string;
      branch_name: string;
      room_type_name: string;
      room_number: string;
      check_in: Date;
      check_out: Date;
      nights: number;
      total_paid: string;
      loyalty_points: number;
      status: string;
      compressed_details: any;
    }>(
      `SELECT 
         archive_id,
         booking_id,
         booking_ref,
         branch_name,
         room_type_name,
         room_number,
         check_in,
         check_out,
         nights,
         total_paid,
         loyalty_points,
         status,
         compressed_details
       FROM guest_activity_archive
       WHERE guest_id = $1
       ORDER BY check_in DESC`,
      [guestId]
    );

    // 2. Fetch any live/recent non-archived bookings for this guest
    const { rows: liveRows } = await this.db.query<{
      booking_id: string;
      id: string;
      branch_name: string;
      room_type_name: string;
      room_number: string;
      check_in: Date;
      check_out: Date;
      status: string;
      rate_at_booking: string;
      invoice_total: string;
    }>(
      `SELECT 
         b.booking_id,
         b.id,
         COALESCE(brh.branch_name, 'Sky Nest Sanctuary') AS branch_name,
         COALESCE(rt.type_name, r.type::text, 'Luxury Suite') AS room_type_name,
         COALESCE(r.room_number, r.number, 'Suite') AS room_number,
         b.check_in,
         b.check_out,
         b.status,
         br.rate_at_booking,
         COALESCE(inv.total_amount, 0.00)::text AS invoice_total
       FROM bookings b
       LEFT JOIN branches brh ON brh.branch_id = b.branch_id
       LEFT JOIN booking_rooms br ON br.booking_id = b.booking_id
       LEFT JOIN rooms r ON r.id::text = br.room_id::text
       LEFT JOIN room_types rt ON rt.room_type_id = COALESCE(br.room_type_id, r.room_type_id)
       LEFT JOIN invoices inv ON inv.booking_room_id = br.booking_room_id
       WHERE (b.booked_by_guest_id = $1 OR b.guest_id = $1)
         AND b.booking_id NOT IN (SELECT booking_id FROM guest_activity_archive WHERE guest_id = $1)
       ORDER BY b.check_in DESC`,
      [guestId]
    );

    // Format archived stays
    const bookings: ActivityStay[] = archivedRows.map((r) => {
      const details = r.compressed_details || {};
      const services = Array.isArray(details.services)
        ? details.services.map((s: any) => ({
            serviceName: s.service_name ?? 'Hotel Service',
            category: s.category ?? 'General',
            quantity: Number(s.quantity ?? 1),
            unitPrice: parseFloat(s.unit_price ?? 0),
            totalPrice: parseFloat(s.total_price ?? 0),
            usedAt: s.used_at ? new Date(s.used_at).toISOString() : new Date(r.check_in).toISOString(),
          }))
        : [];

      return {
        archiveId: r.archive_id,
        bookingId: r.booking_id,
        bookingRef: r.booking_ref,
        branchName: r.branch_name,
        roomTypeName: r.room_type_name,
        roomNumber: r.room_number,
        checkIn: new Date(r.check_in).toISOString(),
        checkOut: new Date(r.check_out).toISOString(),
        nights: r.nights,
        totalPaid: parseFloat(r.total_paid),
        loyaltyPoints: r.loyalty_points,
        status: r.status,
        services,
        isArchived: true,
      };
    });

    // Append any live bookings
    for (const l of liveRows) {
      const checkInDate = new Date(l.check_in);
      const checkOutDate = new Date(l.check_out);
      const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
      const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      const rate = parseFloat(l.rate_at_booking || '150');
      const invoiceTot = parseFloat(l.invoice_total || '0');
      const totalPaid = invoiceTot > 0 ? invoiceTot : nights * rate;
      const loyaltyPoints = l.status === 'CHECKED_OUT' ? Math.floor(totalPaid / 10) : 0;

      bookings.push({
        archiveId: l.booking_id,
        bookingId: l.booking_id,
        bookingRef: l.id || l.booking_id.substring(0, 8),
        branchName: l.branch_name,
        roomTypeName: l.room_type_name,
        roomNumber: l.room_number,
        checkIn: checkInDate.toISOString(),
        checkOut: checkOutDate.toISOString(),
        nights,
        totalPaid,
        loyaltyPoints,
        status: l.status,
        services: [],
        isArchived: false,
      });
    }

    // Sort all bookings newest first
    bookings.sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());

    // Calculate overall stats
    const totalPoints = bookings.reduce((sum, b) => sum + (b.loyaltyPoints || 0), 0);
    const totalSpent = bookings.reduce((sum, b) => sum + (b.totalPaid || 0), 0);
    const totalStays = bookings.filter((b) => b.status === 'CHECKED_OUT').length;

    // Determine loyalty tier
    let loyaltyTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' = 'BRONZE';
    if (totalPoints >= 1000) loyaltyTier = 'PLATINUM';
    else if (totalPoints >= 500) loyaltyTier = 'GOLD';
    else if (totalPoints >= 200) loyaltyTier = 'SILVER';

    return {
      guest,
      stats: {
        totalPoints,
        totalSpent,
        totalStays,
        loyaltyTier,
      },
      bookings,
    };
  }
}
