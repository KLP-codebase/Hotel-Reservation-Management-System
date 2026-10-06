export const GET_SERVICE_USAGE_BREAKDOWN_QUERY = `
  SELECT
    sc.category,
    sc.service_name,
    rm.number AS room_number,
    br.branch_name,
    COUNT(su.usage_id)::int AS orders_count,
    SUM(su.quantity)::int AS total_quantity,
    ROUND(AVG(su.price_at_usage), 2)::float AS avg_unit_price,
    ROUND(SUM(su.quantity * su.price_at_usage), 2)::float AS total_service_revenue,
    MIN(su.used_at) AS first_used,
    MAX(su.used_at) AS last_used
  FROM service_usage su
  JOIN service_catalogue sc ON sc.service_id = su.service_id
  JOIN booking_rooms bkr ON bkr.booking_room_id = su.booking_room_id
  JOIN rooms rm ON rm.id = bkr.room_id
  JOIN branches br ON br.branch_id = rm.branch_id
  WHERE ($1::uuid IS NULL OR rm.branch_id = $1::uuid)
    AND ($2::date IS NULL OR su.used_at::date >= $2::date)
    AND ($3::date IS NULL OR su.used_at::date <= $3::date)
    AND ($4::text IS NULL OR $4 = 'ALL' OR sc.category ILIKE $4)
  GROUP BY sc.category, sc.service_name, rm.number, br.branch_name
  ORDER BY total_service_revenue DESC, sc.category ASC;
`;