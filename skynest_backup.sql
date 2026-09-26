--
-- PostgreSQL database dump
--

\restrict nEkD3ZMpO8R76Rfa5Yj3l2Zu7qmpoOYOOo3WqGxsUgA3icmdQs7iFm5pRLP9ZEZ

-- Dumped from database version 15.19
-- Dumped by pg_dump version 15.19

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: fn_check_room_availability(integer, date, date, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_check_room_availability(p_room_id integer, p_check_in date, p_check_out date, p_exclude_booking_room_id uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_conflict_count INT;
BEGIN
    -- Validate: check-out must be after check-in
    IF p_check_out <= p_check_in THEN
        RAISE EXCEPTION 'check_out_date must be after check_in_date';
    END IF;

    -- Count any active bookings on this room that overlap the requested dates
    SELECT COUNT(*) INTO v_conflict_count
    FROM booking_rooms
    WHERE room_id        = p_room_id
      AND status        <> 'CANCELLED'
      AND booking_room_id <> COALESCE(p_exclude_booking_room_id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND check_in_date  < p_check_out   -- existing booking starts before new one ends
      AND check_out_date > p_check_in;   -- existing booking ends after new one starts

    -- Return TRUE (available) if no conflicts found
    RETURN v_conflict_count = 0;
END;
$$;


ALTER FUNCTION public.fn_check_room_availability(p_room_id integer, p_check_in date, p_check_out date, p_exclude_booking_room_id uuid) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accompanying_guests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accompanying_guests (
    verification_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    booking_room_id uuid NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    id_passport_no character varying(100) NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    verified_by_staff_id integer
);


ALTER TABLE public.accompanying_guests OWNER TO postgres;

--
-- Name: booking_rooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.booking_rooms (
    booking_room_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    booking_id uuid NOT NULL,
    primary_guest_id uuid NOT NULL,
    room_type_id integer NOT NULL,
    room_id integer,
    plan_id integer NOT NULL,
    check_in_date date NOT NULL,
    check_out_date date NOT NULL,
    rate_at_booking numeric(10,2) NOT NULL,
    status character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT booking_rooms_check CHECK ((check_out_date > check_in_date))
);


ALTER TABLE public.booking_rooms OWNER TO postgres;

--
-- Name: bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bookings (
    booking_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    branch_id integer NOT NULL,
    booked_by_guest_id uuid,
    booked_by_staff_id integer,
    status character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT bookings_check CHECK (((booked_by_guest_id IS NOT NULL) OR (booked_by_staff_id IS NOT NULL)))
);


ALTER TABLE public.bookings OWNER TO postgres;

--
-- Name: branches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.branches (
    branch_id integer NOT NULL,
    branch_name character varying(100) NOT NULL,
    city character varying(100) NOT NULL,
    address text,
    phone character varying(50),
    email character varying(255),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.branches OWNER TO postgres;

--
-- Name: branches_branch_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.branches_branch_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.branches_branch_id_seq OWNER TO postgres;

--
-- Name: branches_branch_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.branches_branch_id_seq OWNED BY public.branches.branch_id;


--
-- Name: change_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.change_log (
    log_id bigint NOT NULL,
    table_name character varying(100) NOT NULL,
    record_id character varying(100) NOT NULL,
    action character varying(20) NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_by_account_id uuid,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.change_log OWNER TO postgres;

--
-- Name: change_log_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.change_log_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.change_log_log_id_seq OWNER TO postgres;

--
-- Name: change_log_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.change_log_log_id_seq OWNED BY public.change_log.log_id;


--
-- Name: guests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.guests (
    guest_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255),
    phone character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.guests OWNER TO postgres;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    invoice_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    booking_room_id uuid NOT NULL,
    room_charges numeric(12,2) DEFAULT 0 NOT NULL,
    service_charges numeric(12,2) DEFAULT 0 NOT NULL,
    discount_amount numeric(12,2) DEFAULT 0 NOT NULL,
    service_charge_tax numeric(12,2) DEFAULT 0 NOT NULL,
    ssc_amount numeric(12,2) DEFAULT 0 NOT NULL,
    vat_amount numeric(12,2) DEFAULT 0 NOT NULL,
    total_amount numeric(12,2) DEFAULT 0 NOT NULL,
    status character varying(50) DEFAULT 'OPEN'::character varying NOT NULL,
    generated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: meal_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meal_plans (
    plan_id integer NOT NULL,
    plan_name character varying(100) NOT NULL,
    description text,
    price_per_night numeric(10,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public.meal_plans OWNER TO postgres;

--
-- Name: meal_plans_plan_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.meal_plans_plan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.meal_plans_plan_id_seq OWNER TO postgres;

--
-- Name: meal_plans_plan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.meal_plans_plan_id_seq OWNED BY public.meal_plans.plan_id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    payment_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    invoice_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    payment_method character varying(50) NOT NULL,
    reference_number character varying(100),
    recorded_by_staff_id integer,
    CONSTRAINT payments_amount_check CHECK ((amount > (0)::numeric))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: report_snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_snapshots (
    snapshot_id integer NOT NULL,
    report_type character varying(100) NOT NULL,
    report_period_start date NOT NULL,
    report_period_end date NOT NULL,
    branch_id integer,
    report_data jsonb NOT NULL,
    generated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    generated_by_staff_id integer
);


ALTER TABLE public.report_snapshots OWNER TO postgres;

--
-- Name: report_snapshots_snapshot_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.report_snapshots_snapshot_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.report_snapshots_snapshot_id_seq OWNER TO postgres;

--
-- Name: report_snapshots_snapshot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.report_snapshots_snapshot_id_seq OWNED BY public.report_snapshots.snapshot_id;


--
-- Name: room_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.room_types (
    room_type_id integer NOT NULL,
    type_name character varying(100) NOT NULL,
    base_daily_rate numeric(10,2) NOT NULL,
    capacity smallint NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT room_types_base_daily_rate_check CHECK ((base_daily_rate > (0)::numeric)),
    CONSTRAINT room_types_capacity_check CHECK ((capacity > 0))
);


ALTER TABLE public.room_types OWNER TO postgres;

--
-- Name: room_types_room_type_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.room_types_room_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.room_types_room_type_id_seq OWNER TO postgres;

--
-- Name: room_types_room_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.room_types_room_type_id_seq OWNED BY public.room_types.room_type_id;


--
-- Name: rooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rooms (
    room_id integer NOT NULL,
    branch_id integer NOT NULL,
    room_type_id integer NOT NULL,
    room_number character varying(20) NOT NULL,
    floor integer,
    status character varying(50) DEFAULT 'AVAILABLE'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.rooms OWNER TO postgres;

--
-- Name: rooms_room_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rooms_room_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.rooms_room_id_seq OWNER TO postgres;

--
-- Name: rooms_room_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rooms_room_id_seq OWNED BY public.rooms.room_id;


--
-- Name: service_catalogue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_catalogue (
    service_id integer NOT NULL,
    branch_id integer NOT NULL,
    service_name character varying(100) NOT NULL,
    category character varying(50),
    base_price numeric(10,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.service_catalogue OWNER TO postgres;

--
-- Name: service_catalogue_service_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.service_catalogue_service_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.service_catalogue_service_id_seq OWNER TO postgres;

--
-- Name: service_catalogue_service_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.service_catalogue_service_id_seq OWNED BY public.service_catalogue.service_id;


--
-- Name: service_usage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_usage (
    usage_id integer NOT NULL,
    booking_room_id uuid NOT NULL,
    service_id integer NOT NULL,
    quantity smallint NOT NULL,
    price_at_usage numeric(10,2) NOT NULL,
    recorded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    recorded_by_staff_id integer,
    CONSTRAINT service_usage_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.service_usage OWNER TO postgres;

--
-- Name: service_usage_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.service_usage_usage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.service_usage_usage_id_seq OWNER TO postgres;

--
-- Name: service_usage_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.service_usage_usage_id_seq OWNED BY public.service_usage.usage_id;


--
-- Name: staff; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff (
    staff_id integer NOT NULL,
    branch_id integer,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(50),
    role character varying(50) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.staff OWNER TO postgres;

--
-- Name: staff_staff_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.staff_staff_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.staff_staff_id_seq OWNER TO postgres;

--
-- Name: staff_staff_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.staff_staff_id_seq OWNED BY public.staff.staff_id;


--
-- Name: tax_configurations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tax_configurations (
    tax_id integer NOT NULL,
    tax_name character varying(100) NOT NULL,
    tax_percentage numeric(5,4) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    external_api_reference character varying(255),
    last_synced_at timestamp without time zone,
    CONSTRAINT tax_configurations_tax_percentage_check CHECK ((tax_percentage >= (0)::numeric))
);


ALTER TABLE public.tax_configurations OWNER TO postgres;

--
-- Name: tax_configurations_tax_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tax_configurations_tax_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tax_configurations_tax_id_seq OWNER TO postgres;

--
-- Name: tax_configurations_tax_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tax_configurations_tax_id_seq OWNED BY public.tax_configurations.tax_id;


--
-- Name: user_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_accounts (
    account_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    account_type character varying(50) NOT NULL,
    staff_id integer,
    guest_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_accounts_check CHECK (((((account_type)::text = 'Staff'::text) AND (staff_id IS NOT NULL) AND (guest_id IS NULL)) OR (((account_type)::text = 'Member'::text) AND (guest_id IS NOT NULL) AND (staff_id IS NULL))))
);


ALTER TABLE public.user_accounts OWNER TO postgres;

--
-- Name: v_booking_details; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_booking_details AS
 SELECT b.booking_id,
    b.status AS booking_status,
    b.notes,
    b.created_at AS booked_at,
    br.branch_id,
    br.branch_name,
    br.city AS branch_city,
    g_booker.guest_id AS booker_guest_id,
    g_booker.first_name AS booker_first_name,
    g_booker.last_name AS booker_last_name,
    g_booker.email AS booker_email,
    g_booker.phone AS booker_phone,
    br_room.booking_room_id,
    br_room.check_in_date,
    br_room.check_out_date,
    (br_room.check_out_date - br_room.check_in_date) AS nights,
    br_room.rate_at_booking,
    (((br_room.check_out_date - br_room.check_in_date))::numeric * br_room.rate_at_booking) AS room_total,
    br_room.status AS room_status,
    r.room_id,
    r.room_number,
    r.floor,
    rt.type_name AS room_type,
    rt.capacity,
    mp.plan_name AS meal_plan,
    mp.price_per_night AS meal_price_per_night,
    g_primary.guest_id AS primary_guest_id,
    g_primary.first_name AS primary_guest_first_name,
    g_primary.last_name AS primary_guest_last_name
   FROM (((((((public.bookings b
     JOIN public.branches br ON ((b.branch_id = br.branch_id)))
     LEFT JOIN public.guests g_booker ON ((b.booked_by_guest_id = g_booker.guest_id)))
     JOIN public.booking_rooms br_room ON ((b.booking_id = br_room.booking_id)))
     JOIN public.rooms r ON ((br_room.room_id = r.room_id)))
     JOIN public.room_types rt ON ((br_room.room_type_id = rt.room_type_id)))
     JOIN public.meal_plans mp ON ((br_room.plan_id = mp.plan_id)))
     JOIN public.guests g_primary ON ((br_room.primary_guest_id = g_primary.guest_id)));


ALTER TABLE public.v_booking_details OWNER TO postgres;

--
-- Name: branches branch_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches ALTER COLUMN branch_id SET DEFAULT nextval('public.branches_branch_id_seq'::regclass);


--
-- Name: change_log log_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.change_log ALTER COLUMN log_id SET DEFAULT nextval('public.change_log_log_id_seq'::regclass);


--
-- Name: meal_plans plan_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meal_plans ALTER COLUMN plan_id SET DEFAULT nextval('public.meal_plans_plan_id_seq'::regclass);


--
-- Name: report_snapshots snapshot_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_snapshots ALTER COLUMN snapshot_id SET DEFAULT nextval('public.report_snapshots_snapshot_id_seq'::regclass);


--
-- Name: room_types room_type_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_types ALTER COLUMN room_type_id SET DEFAULT nextval('public.room_types_room_type_id_seq'::regclass);


--
-- Name: rooms room_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rooms ALTER COLUMN room_id SET DEFAULT nextval('public.rooms_room_id_seq'::regclass);


--
-- Name: service_catalogue service_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_catalogue ALTER COLUMN service_id SET DEFAULT nextval('public.service_catalogue_service_id_seq'::regclass);


--
-- Name: service_usage usage_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_usage ALTER COLUMN usage_id SET DEFAULT nextval('public.service_usage_usage_id_seq'::regclass);


--
-- Name: staff staff_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff ALTER COLUMN staff_id SET DEFAULT nextval('public.staff_staff_id_seq'::regclass);


--
-- Name: tax_configurations tax_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tax_configurations ALTER COLUMN tax_id SET DEFAULT nextval('public.tax_configurations_tax_id_seq'::regclass);


--
-- Data for Name: accompanying_guests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.accompanying_guests (verification_id, booking_room_id, first_name, last_name, id_passport_no, is_verified, verified_by_staff_id) FROM stdin;
\.


--
-- Data for Name: booking_rooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.booking_rooms (booking_room_id, booking_id, primary_guest_id, room_type_id, room_id, plan_id, check_in_date, check_out_date, rate_at_booking, status, created_at) FROM stdin;
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bookings (booking_id, branch_id, booked_by_guest_id, booked_by_staff_id, status, notes, created_at) FROM stdin;
\.


--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.branches (branch_id, branch_name, city, address, phone, email, is_active, created_at, updated_at) FROM stdin;
1	Sky Nest Colombo	Colombo	45 Galle Road, Colombo 03	+94 11 234 5678	colombo@skynest.lk	t	2026-09-04 05:43:56.006173	2026-09-04 05:43:56.006173
2	Sky Nest Kandy	Kandy	12 Dalada Veediya, Kandy	+94 81 234 5678	kandy@skynest.lk	t	2026-09-04 05:43:56.006173	2026-09-04 05:43:56.006173
3	Sky Nest Galle	Galle	8 Church Street, Galle Fort, Galle	+94 91 234 5678	galle@skynest.lk	t	2026-09-04 05:43:56.006173	2026-09-04 05:43:56.006173
\.


--
-- Data for Name: change_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.change_log (log_id, table_name, record_id, action, old_data, new_data, changed_by_account_id, changed_at) FROM stdin;
\.


--
-- Data for Name: guests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.guests (guest_id, first_name, last_name, email, phone, created_at) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (invoice_id, booking_room_id, room_charges, service_charges, discount_amount, service_charge_tax, ssc_amount, vat_amount, total_amount, status, generated_at) FROM stdin;
\.


--
-- Data for Name: meal_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.meal_plans (plan_id, plan_name, description, price_per_night) FROM stdin;
1	Room Only	No meals included	0.00
2	Bed & Breakfast	Breakfast included	25.00
3	Half Board	Breakfast and dinner included	55.00
4	Full Board	All three meals included	80.00
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (payment_id, invoice_id, amount, payment_date, payment_method, reference_number, recorded_by_staff_id) FROM stdin;
\.


--
-- Data for Name: report_snapshots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.report_snapshots (snapshot_id, report_type, report_period_start, report_period_end, branch_id, report_data, generated_at, generated_by_staff_id) FROM stdin;
\.


--
-- Data for Name: room_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.room_types (room_type_id, type_name, base_daily_rate, capacity, description, created_at, updated_at) FROM stdin;
1	Standard	120.00	2	Comfortable standard room with garden view	2026-09-04 05:43:56.097046	2026-09-04 05:43:56.097046
2	Deluxe	220.00	2	Spacious deluxe room with partial ocean view	2026-09-04 05:43:56.097046	2026-09-04 05:43:56.097046
3	Suite	450.00	4	Luxury suite with living area and full ocean view	2026-09-04 05:43:56.097046	2026-09-04 05:43:56.097046
4	Presidential	950.00	6	Top-floor presidential suite with private terrace	2026-09-04 05:43:56.097046	2026-09-04 05:43:56.097046
\.


--
-- Data for Name: rooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rooms (room_id, branch_id, room_type_id, room_number, floor, status, is_active, created_at, updated_at) FROM stdin;
1	1	1	101	1	AVAILABLE	t	2026-09-04 05:43:56.099225	2026-09-04 05:43:56.099225
2	1	2	201	2	AVAILABLE	t	2026-09-04 05:43:56.099225	2026-09-04 05:43:56.099225
3	1	3	301	3	AVAILABLE	t	2026-09-04 05:43:56.099225	2026-09-04 05:43:56.099225
4	1	4	401	4	AVAILABLE	t	2026-09-04 05:43:56.099225	2026-09-04 05:43:56.099225
5	1	1	102	1	AVAILABLE	t	2026-09-04 05:43:56.099225	2026-09-04 05:43:56.099225
6	2	1	101	1	AVAILABLE	t	2026-09-04 05:43:56.099225	2026-09-04 05:43:56.099225
7	2	2	201	2	AVAILABLE	t	2026-09-04 05:43:56.099225	2026-09-04 05:43:56.099225
8	2	3	301	3	AVAILABLE	t	2026-09-04 05:43:56.099225	2026-09-04 05:43:56.099225
9	2	1	102	1	AVAILABLE	t	2026-09-04 05:43:56.099225	2026-09-04 05:43:56.099225
10	2	2	202	2	AVAILABLE	t	2026-09-04 05:43:56.099225	2026-09-04 05:43:56.099225
11	3	1	101	1	AVAILABLE	t	2026-09-04 05:43:56.099225	2026-09-04 05:43:56.099225
12	3	2	201	2	AVAILABLE	t	2026-09-04 05:43:56.099225	2026-09-04 05:43:56.099225
13	3	3	301	3	AVAILABLE	t	2026-09-04 05:43:56.099225	2026-09-04 05:43:56.099225
14	3	4	401	4	AVAILABLE	t	2026-09-04 05:43:56.099225	2026-09-04 05:43:56.099225
15	3	1	102	1	AVAILABLE	t	2026-09-04 05:43:56.099225	2026-09-04 05:43:56.099225
\.


--
-- Data for Name: service_catalogue; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.service_catalogue (service_id, branch_id, service_name, category, base_price, is_active) FROM stdin;
\.


--
-- Data for Name: service_usage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.service_usage (usage_id, booking_room_id, service_id, quantity, price_at_usage, recorded_at, recorded_by_staff_id) FROM stdin;
\.


--
-- Data for Name: staff; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.staff (staff_id, branch_id, first_name, last_name, email, phone, role, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tax_configurations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tax_configurations (tax_id, tax_name, tax_percentage, is_active, effective_from, effective_to, external_api_reference, last_synced_at) FROM stdin;
1	VAT	0.1800	t	2024-01-01	\N	\N	\N
2	Service Charge	0.1000	t	2024-01-01	\N	\N	\N
3	SSC Levy	0.0250	t	2024-01-01	\N	\N	\N
\.


--
-- Data for Name: user_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_accounts (account_id, username, password_hash, account_type, staff_id, guest_id, is_active, last_login_at, created_at, updated_at) FROM stdin;
\.


--
-- Name: branches_branch_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.branches_branch_id_seq', 3, true);


--
-- Name: change_log_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.change_log_log_id_seq', 1, false);


--
-- Name: meal_plans_plan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.meal_plans_plan_id_seq', 4, true);


--
-- Name: report_snapshots_snapshot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.report_snapshots_snapshot_id_seq', 1, false);


--
-- Name: room_types_room_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.room_types_room_type_id_seq', 4, true);


--
-- Name: rooms_room_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rooms_room_id_seq', 15, true);


--
-- Name: service_catalogue_service_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.service_catalogue_service_id_seq', 1, false);


--
-- Name: service_usage_usage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.service_usage_usage_id_seq', 1, false);


--
-- Name: staff_staff_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.staff_staff_id_seq', 1, false);


--
-- Name: tax_configurations_tax_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tax_configurations_tax_id_seq', 3, true);


--
-- Name: accompanying_guests accompanying_guests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accompanying_guests
    ADD CONSTRAINT accompanying_guests_pkey PRIMARY KEY (verification_id);


--
-- Name: booking_rooms booking_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_rooms
    ADD CONSTRAINT booking_rooms_pkey PRIMARY KEY (booking_room_id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (booking_id);


--
-- Name: branches branches_branch_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_branch_name_key UNIQUE (branch_name);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (branch_id);


--
-- Name: change_log change_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.change_log
    ADD CONSTRAINT change_log_pkey PRIMARY KEY (log_id);


--
-- Name: guests guests_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_email_key UNIQUE (email);


--
-- Name: guests guests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_pkey PRIMARY KEY (guest_id);


--
-- Name: invoices invoices_booking_room_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_booking_room_id_key UNIQUE (booking_room_id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (invoice_id);


--
-- Name: meal_plans meal_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meal_plans
    ADD CONSTRAINT meal_plans_pkey PRIMARY KEY (plan_id);


--
-- Name: meal_plans meal_plans_plan_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meal_plans
    ADD CONSTRAINT meal_plans_plan_name_key UNIQUE (plan_name);


--
-- Name: booking_rooms no_double_booking; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_rooms
    ADD CONSTRAINT no_double_booking EXCLUDE USING gist (room_id WITH =, daterange(check_in_date, check_out_date, '[)'::text) WITH &&) WHERE (((status)::text <> 'CANCELLED'::text));


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (payment_id);


--
-- Name: report_snapshots report_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_snapshots
    ADD CONSTRAINT report_snapshots_pkey PRIMARY KEY (snapshot_id);


--
-- Name: room_types room_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_types
    ADD CONSTRAINT room_types_pkey PRIMARY KEY (room_type_id);


--
-- Name: room_types room_types_type_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_types
    ADD CONSTRAINT room_types_type_name_key UNIQUE (type_name);


--
-- Name: rooms rooms_branch_id_room_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_branch_id_room_number_key UNIQUE (branch_id, room_number);


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (room_id);


--
-- Name: service_catalogue service_catalogue_branch_id_service_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_catalogue
    ADD CONSTRAINT service_catalogue_branch_id_service_name_key UNIQUE (branch_id, service_name);


--
-- Name: service_catalogue service_catalogue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_catalogue
    ADD CONSTRAINT service_catalogue_pkey PRIMARY KEY (service_id);


--
-- Name: service_usage service_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_usage
    ADD CONSTRAINT service_usage_pkey PRIMARY KEY (usage_id);


--
-- Name: staff staff_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_email_key UNIQUE (email);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (staff_id);


--
-- Name: tax_configurations tax_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tax_configurations
    ADD CONSTRAINT tax_configurations_pkey PRIMARY KEY (tax_id);


--
-- Name: tax_configurations tax_configurations_tax_name_effective_from_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tax_configurations
    ADD CONSTRAINT tax_configurations_tax_name_effective_from_key UNIQUE (tax_name, effective_from);


--
-- Name: user_accounts user_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_accounts
    ADD CONSTRAINT user_accounts_pkey PRIMARY KEY (account_id);


--
-- Name: user_accounts user_accounts_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_accounts
    ADD CONSTRAINT user_accounts_username_key UNIQUE (username);


--
-- Name: idx_accompanying_broom; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_accompanying_broom ON public.accompanying_guests USING btree (booking_room_id);


--
-- Name: idx_bookings_branch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_branch ON public.bookings USING btree (branch_id);


--
-- Name: idx_bookings_guest; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_guest ON public.bookings USING btree (booked_by_guest_id);


--
-- Name: idx_bookings_staff; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_staff ON public.bookings USING btree (booked_by_staff_id);


--
-- Name: idx_bookings_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_status ON public.bookings USING btree (status);


--
-- Name: idx_brooms_booking; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_brooms_booking ON public.booking_rooms USING btree (booking_id);


--
-- Name: idx_brooms_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_brooms_dates ON public.booking_rooms USING btree (check_in_date, check_out_date);


--
-- Name: idx_brooms_guest; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_brooms_guest ON public.booking_rooms USING btree (primary_guest_id);


--
-- Name: idx_brooms_room; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_brooms_room ON public.booking_rooms USING btree (room_id);


--
-- Name: idx_brooms_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_brooms_status ON public.booking_rooms USING btree (status);


--
-- Name: idx_guests_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_guests_email ON public.guests USING btree (email);


--
-- Name: idx_guests_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_guests_name ON public.guests USING btree (first_name, last_name);


--
-- Name: accompanying_guests accompanying_guests_booking_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accompanying_guests
    ADD CONSTRAINT accompanying_guests_booking_room_id_fkey FOREIGN KEY (booking_room_id) REFERENCES public.booking_rooms(booking_room_id) ON DELETE CASCADE;


--
-- Name: accompanying_guests accompanying_guests_verified_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accompanying_guests
    ADD CONSTRAINT accompanying_guests_verified_by_staff_id_fkey FOREIGN KEY (verified_by_staff_id) REFERENCES public.staff(staff_id) ON DELETE SET NULL;


--
-- Name: booking_rooms booking_rooms_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_rooms
    ADD CONSTRAINT booking_rooms_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(booking_id) ON DELETE CASCADE;


--
-- Name: booking_rooms booking_rooms_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_rooms
    ADD CONSTRAINT booking_rooms_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.meal_plans(plan_id) ON DELETE RESTRICT;


--
-- Name: booking_rooms booking_rooms_primary_guest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_rooms
    ADD CONSTRAINT booking_rooms_primary_guest_id_fkey FOREIGN KEY (primary_guest_id) REFERENCES public.guests(guest_id) ON DELETE RESTRICT;


--
-- Name: booking_rooms booking_rooms_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_rooms
    ADD CONSTRAINT booking_rooms_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(room_id) ON DELETE RESTRICT;


--
-- Name: booking_rooms booking_rooms_room_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_rooms
    ADD CONSTRAINT booking_rooms_room_type_id_fkey FOREIGN KEY (room_type_id) REFERENCES public.room_types(room_type_id) ON DELETE RESTRICT;


--
-- Name: bookings bookings_booked_by_guest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_booked_by_guest_id_fkey FOREIGN KEY (booked_by_guest_id) REFERENCES public.guests(guest_id) ON DELETE SET NULL;


--
-- Name: bookings bookings_booked_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_booked_by_staff_id_fkey FOREIGN KEY (booked_by_staff_id) REFERENCES public.staff(staff_id) ON DELETE SET NULL;


--
-- Name: bookings bookings_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE RESTRICT;


--
-- Name: change_log change_log_changed_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.change_log
    ADD CONSTRAINT change_log_changed_by_account_id_fkey FOREIGN KEY (changed_by_account_id) REFERENCES public.user_accounts(account_id) ON DELETE SET NULL;


--
-- Name: invoices invoices_booking_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_booking_room_id_fkey FOREIGN KEY (booking_room_id) REFERENCES public.booking_rooms(booking_room_id) ON DELETE RESTRICT;


--
-- Name: payments payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(invoice_id) ON DELETE RESTRICT;


--
-- Name: payments payments_recorded_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_recorded_by_staff_id_fkey FOREIGN KEY (recorded_by_staff_id) REFERENCES public.staff(staff_id) ON DELETE SET NULL;


--
-- Name: report_snapshots report_snapshots_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_snapshots
    ADD CONSTRAINT report_snapshots_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE SET NULL;


--
-- Name: report_snapshots report_snapshots_generated_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_snapshots
    ADD CONSTRAINT report_snapshots_generated_by_staff_id_fkey FOREIGN KEY (generated_by_staff_id) REFERENCES public.staff(staff_id) ON DELETE SET NULL;


--
-- Name: rooms rooms_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE RESTRICT;


--
-- Name: rooms rooms_room_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_room_type_id_fkey FOREIGN KEY (room_type_id) REFERENCES public.room_types(room_type_id) ON DELETE RESTRICT;


--
-- Name: service_catalogue service_catalogue_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_catalogue
    ADD CONSTRAINT service_catalogue_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE RESTRICT;


--
-- Name: service_usage service_usage_booking_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_usage
    ADD CONSTRAINT service_usage_booking_room_id_fkey FOREIGN KEY (booking_room_id) REFERENCES public.booking_rooms(booking_room_id) ON DELETE CASCADE;


--
-- Name: service_usage service_usage_recorded_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_usage
    ADD CONSTRAINT service_usage_recorded_by_staff_id_fkey FOREIGN KEY (recorded_by_staff_id) REFERENCES public.staff(staff_id) ON DELETE SET NULL;


--
-- Name: service_usage service_usage_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_usage
    ADD CONSTRAINT service_usage_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.service_catalogue(service_id) ON DELETE RESTRICT;


--
-- Name: staff staff_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE SET NULL;


--
-- Name: user_accounts user_accounts_guest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_accounts
    ADD CONSTRAINT user_accounts_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guests(guest_id) ON DELETE CASCADE;


--
-- Name: user_accounts user_accounts_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_accounts
    ADD CONSTRAINT user_accounts_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict nEkD3ZMpO8R76Rfa5Yj3l2Zu7qmpoOYOOo3WqGxsUgA3icmdQs7iFm5pRLP9ZEZ

