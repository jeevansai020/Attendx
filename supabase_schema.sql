-- ═══════════════════════════════════════════════════════════════
--  AttendX – Supabase Schema v1.2  (Production Hardened + Bug Fixed)
--  Run this entire file in Supabase SQL Editor → New query
--  Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE
-- ═══════════════════════════════════════════════════════════════

-- ── AUTO-UPDATE TRIGGER FUNCTION ─────────────────────────────
create or replace function ax_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── TABLES ────────────────────────────────────────────────────

-- FACULTY
create table if not exists faculty (
  id           text primary key,
  name         text not null,
  username     text unique not null,
  password     text not null,
  department   text default 'CSE',
  role         text default 'faculty' check (role in ('super_admin','dean','hod','admin','faculty')),
  last_login   timestamptz,
  status       text default 'active',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  is_active    boolean default true
);

-- CLASSES  (id = 'class_1_A', 'class_2_B', etc.)
create table if not exists classes (
  id           text primary key,
  year         text not null check (year in ('1st Year','2nd Year','3rd Year','4th Year')),
  section      text not null,
  department   text default 'CSE',
  strength     int  default 40,
  created_at   timestamptz default now(),
  is_active    boolean default true,
  constraint uq_class_year_sec unique (year, section, department)
);

-- SUBJECTS
create table if not exists subjects (
  id              text primary key,
  name            text not null,
  code            text,
  department      text default 'CSE',
  year_applicable text check (year_applicable in ('1st Year','2nd Year','3rd Year','4th Year')),
  credits         int  default 3,
  created_at      timestamptz default now(),
  is_active       boolean default true
);

-- STUDENTS
create table if not exists students (
  id           text primary key,
  roll_no      text unique not null,
  name         text not null,
  class_id     text references classes(id),
  department   text default 'CSE',
  status       text default 'active' check (status in ('active','inactive','dropped')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  is_active    boolean default true
);

-- TIMETABLE  (one row per period per faculty)
create table if not exists timetable (
  id           text primary key,
  faculty_id   text references faculty(id),
  class_id     text references classes(id),
  subject_id   text references subjects(id),
  day          text not null check (day in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
  start_time   text not null,
  end_time     text not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  is_active    boolean default true
);

-- EXTRA CLASSES (one-off makeup/extra sessions)
create table if not exists extra_classes (
  id           text primary key default gen_random_uuid()::text,
  faculty_id   text references faculty(id),
  class_id     text references classes(id),
  subject_id   text references subjects(id),
  date         date not null,
  start_time   text not null,
  end_time     text not null,
  reason       text default '',
  status       text default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  is_active    boolean default true
);

-- ATTENDANCE SESSIONS (one session = one class period on one date)
create table if not exists attendance_sessions (
  id              text primary key,
  date            date not null,
  class_id        text references classes(id),
  subject_id      text references subjects(id),
  faculty_id      text references faculty(id),
  timetable_id    text,
  extra_class_id  text references extra_classes(id),
  is_extra        boolean default false,
  total_students  int default 0,
  present_count   int default 0,
  absent_count    int default 0,
  status          text default 'completed' check (status in ('draft','completed','locked')),
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  constraint uq_session_date_class_subject unique (date, class_id, subject_id)
);

-- ATTENDANCE RECORDS (one row per student per session)
create table if not exists attendance_records (
  id           text primary key,
  session_id   text references attendance_sessions(id) on delete cascade,
  student_id   text references students(id),
  roll_no      text not null,
  student_name text,
  status       text not null check (status in ('P','A','L','OD')),
  timestamp    timestamptz default now(),
  version      int default 1,
  is_active    boolean default true
);

-- ── AUTO-UPDATE TRIGGERS ──────────────────────────────────────
drop trigger if exists trg_faculty_updated_at           on faculty;
create trigger trg_faculty_updated_at
  before update on faculty
  for each row execute procedure ax_set_updated_at();

drop trigger if exists trg_students_updated_at          on students;
create trigger trg_students_updated_at
  before update on students
  for each row execute procedure ax_set_updated_at();

drop trigger if exists trg_timetable_updated_at         on timetable;
create trigger trg_timetable_updated_at
  before update on timetable
  for each row execute procedure ax_set_updated_at();

drop trigger if exists trg_extra_classes_updated_at     on extra_classes;
create trigger trg_extra_classes_updated_at
  before update on extra_classes
  for each row execute procedure ax_set_updated_at();

drop trigger if exists trg_att_sessions_updated_at      on attendance_sessions;
create trigger trg_att_sessions_updated_at
  before update on attendance_sessions
  for each row execute procedure ax_set_updated_at();

-- ── INDEXES ──────────────────────────────────────────────────
create index if not exists idx_students_class            on students(class_id);
create index if not exists idx_students_rollno           on students(roll_no);
create index if not exists idx_students_active           on students(class_id, is_active);
create index if not exists idx_timetable_faculty         on timetable(faculty_id, day, is_active);
create index if not exists idx_extra_classes_faculty_date on extra_classes(faculty_id, date);
create index if not exists idx_extra_classes_active      on extra_classes(faculty_id, is_active, status);
create index if not exists idx_sessions_date             on attendance_sessions(date);
create index if not exists idx_sessions_class            on attendance_sessions(class_id, date);
create index if not exists idx_sessions_faculty          on attendance_sessions(faculty_id, date);
create index if not exists idx_sessions_status           on attendance_sessions(status, date);
create index if not exists idx_records_session           on attendance_records(session_id);
create index if not exists idx_records_rollno            on attendance_records(roll_no);
create index if not exists idx_records_student           on attendance_records(student_id);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
alter table faculty              enable row level security;
alter table classes              enable row level security;
alter table subjects             enable row level security;
alter table students             enable row level security;
alter table timetable            enable row level security;
alter table extra_classes        enable row level security;
alter table attendance_sessions  enable row level security;
alter table attendance_records   enable row level security;

-- Open policies (intranet faculty app — tighten by faculty_id later if needed)
do $$ begin
  -- faculty
  if not exists (select 1 from pg_policies where tablename='faculty'             and policyname='anon_all_faculty')            then create policy "anon_all_faculty"            on faculty            for all to anon using (true) with check (true); end if;
  -- classes
  if not exists (select 1 from pg_policies where tablename='classes'             and policyname='anon_all_classes')            then create policy "anon_all_classes"            on classes            for all to anon using (true) with check (true); end if;
  -- subjects
  if not exists (select 1 from pg_policies where tablename='subjects'            and policyname='anon_all_subjects')           then create policy "anon_all_subjects"           on subjects           for all to anon using (true) with check (true); end if;
  -- students
  if not exists (select 1 from pg_policies where tablename='students'            and policyname='anon_all_students')           then create policy "anon_all_students"           on students           for all to anon using (true) with check (true); end if;
  -- timetable
  if not exists (select 1 from pg_policies where tablename='timetable'           and policyname='anon_all_timetable')          then create policy "anon_all_timetable"          on timetable          for all to anon using (true) with check (true); end if;
  -- extra_classes
  if not exists (select 1 from pg_policies where tablename='extra_classes'       and policyname='anon_all_extra_classes')      then create policy "anon_all_extra_classes"      on extra_classes      for all to anon using (true) with check (true); end if;
  -- attendance_sessions
  if not exists (select 1 from pg_policies where tablename='attendance_sessions' and policyname='anon_all_att_sessions')       then create policy "anon_all_att_sessions"       on attendance_sessions for all to anon using (true) with check (true); end if;
  -- attendance_records
  if not exists (select 1 from pg_policies where tablename='attendance_records'  and policyname='anon_all_att_records')        then create policy "anon_all_att_records"        on attendance_records  for all to anon using (true) with check (true); end if;
end $$;

-- ── REALTIME ──────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'timetable'
  ) then alter publication supabase_realtime add table timetable; end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'extra_classes'
  ) then alter publication supabase_realtime add table extra_classes; end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'attendance_sessions'
  ) then alter publication supabase_realtime add table attendance_sessions; end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'attendance_records'
  ) then alter publication supabase_realtime add table attendance_records; end if;
end $$;

-- ── VIEWS ─────────────────────────────────────────────────────
-- Student attendance summary per subject
create or replace view vw_student_attendance_summary as
select
  ar.roll_no,
  ar.student_name,
  ar.student_id,
  s.class_id,
  sub.id as subject_id,
  sub.name as subject_name,
  sub.code as subject_code,
  count(*) filter (where ar.status in ('P','L','OD')) as present_count,
  count(*) filter (where ar.status = 'A') as absent_count,
  count(*) as total_classes,
  round(count(*) filter (where ar.status in ('P','L','OD'))::numeric / nullif(count(*),0)*100,2) as attendance_pct
from attendance_records ar
join attendance_sessions sess on sess.id = ar.session_id
left join students s on s.id = ar.student_id
join subjects sub on sub.id = sess.subject_id
where sess.status = 'completed' and ar.is_active = true
group by ar.roll_no, ar.student_name, ar.student_id, s.class_id, sub.id, sub.name, sub.code;

-- Low attendance (<75%)
create or replace view vw_low_attendance as
select *,
  case
    when attendance_pct < 50 then 'critical'
    when attendance_pct < 65 then 'danger'
    when attendance_pct < 75 then 'warning'
    else 'ok'
  end as alert_level
from vw_student_attendance_summary
where attendance_pct < 75;

-- ── DONE ──────────────────────────────────────────────────────
-- Run supabase_seed.sql next to populate initial data.
