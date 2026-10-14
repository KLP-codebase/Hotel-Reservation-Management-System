export const GET_SERVICE_USAGE_BREAKDOWN_QUERY = `
  SELECT
    sc.category,
    sc.service_name,
    COALESCE(to_jsonb(rm)->>'number', to_jsonb(rm)->>'room_number', 'N/A') AS room_number,
    br.branch_name,
    COUNT(su.usage_id)::int AS orders_count,
    SUM(su.quantity)::int AS total_quantity,
    ROUND(AVG(su.price_at_usage), 2)::float AS avg_unit_price,
    ROUND(SUM(su.quantity * su.price_at_usage), 2)::float AS total_service_revenue,
    MIN(su.used_at) AS first_used,
    MAX(su.used_at) AS last_used
  FROM service_usage su
  JOIN service_catalogue sc ON sc.service_id::text = su.service_id::text
  JOIN booking_rooms bkr ON bkr.booking_room_id::text = su.booking_room_id::text
  JOIN rooms rm ON (rm.id::text = bkr.room_id::text OR rm.room_id::text = bkr.room_id::text)
  JOIN branches br ON br.branch_id::text = rm.branch_id::text
  WHERE ($1::text IS NULL OR $1 = '' OR rm.branch_id::text = $1::text)
    AND ($2::date IS NULL OR su.used_at::date >= $2::date)
    AND ($3::date IS NULL OR su.used_at::date <= $3::date)
    AND ($4::text IS NULL OR $4 = 'ALL' OR sc.category ILIKE $4)
  GROUP BY sc.category, sc.service_name, COALESCE(to_jsonb(rm)->>'number', to_jsonb(rm)->>'room_number', 'N/A'), br.branch_name
  ORDER BY total_service_revenue DESC, sc.category ASC;
`;
