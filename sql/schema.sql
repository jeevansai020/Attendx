-- AttendX Production Schema v2.0
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

create or replace function ax_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- DEPARTMENTS
create table if not exists departments (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique, code text not null unique,
  hod_id uuid, is_active boolean default true,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

-- FACULTY
create table if not exists faculty (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid unique,
  employee_id text unique not null, name text not null,
  email text unique not null, phone text,
  department_id uuid references departments(id),
  role text not null default 'faculty' check (role in ('super_admin','dean','hod','admin','faculty')),
  designation text, joining_date date, is_active boolean default true,
  last_login timestamptz, avatar_url text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table departments add column if not exists hod_id uuid references faculty(id);

-- ACADEMIC YEARS
create table if not exists academic_years (
  id uuid primary key default uuid_generate_v4(),
  label text not null unique, start_date date not null, end_date date not null,
  is_current boolean default false, created_at timestamptz default now()
);
create unique index if not exists uq_current_ay on academic_years(is_current) where is_current = true;

-- SEMESTERS
create table if not exists semesters (
  id uuid primary key default uuid_generate_v4(),
  academic_year_id uuid not null references academic_years(id),
  name text not null, semester_number int,
  start_date date not null, end_date date not null,
  is_current boolean default false,
  status text default 'upcoming' check (status in ('upcoming','active','completed')),
  created_at timestamptz default now(), updated_at timestamptz default now(),
  constraint uq_sem_year unique (academic_year_id, name)
);

-- CLASSES
create table if not exists classes (
  id uuid primary key default uuid_generate_v4(),
  semester_id uuid not null references semesters(id),
  department_id uuid not null references departments(id),
  year text not null check (year in ('1st Year','2nd Year','3rd Year','4th Year')),
  section text not null, strength int default 60, room text,
  is_active boolean default true,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  constraint uq_class unique (semester_id, department_id, year, section)
);

-- SUBJECTS
create table if not exists subjects (
  id uuid primary key default uuid_generate_v4(),
  semester_id uuid not null references semesters(id),
  department_id uuid references departments(id),
  name text not null, code text not null,
  year_applicable text check (year_applicable in ('1st Year','2nd Year','3rd Year','4th Year')),
  credits int default 3, type text default 'theory' check (type in ('theory','lab','project')),
  total_hours int default 60, is_active boolean default true,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  constraint uq_sub_code unique (semester_id, code)
);

-- STUDENTS
create table if not exists students (
  id uuid primary key default uuid_generate_v4(),
  roll_no text not null, name text not null, email text, phone text,
  class_id uuid not null references classes(id),
  semester_id uuid not null references semesters(id),
  department_id uuid not null references departments(id),
  batch text, gender text check (gender in ('M','F','Other')),
  status text default 'active' check (status in ('active','inactive','dropped')),
  is_active boolean default true,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  constraint uq_roll_sem unique (semester_id, roll_no)
);

-- CLASS-SUBJECT-FACULTY MAPPING
create table if not exists class_subject_mapping (
  id uuid primary key default uuid_generate_v4(),
  semester_id uuid not null references semesters(id),
  class_id uuid not null references classes(id),
  subject_id uuid not null references subjects(id),
  faculty_id uuid not null references faculty(id),
  is_active boolean default true,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  constraint uq_csm unique (semester_id, class_id, subject_id)
);

-- TIMETABLE
create table if not exists timetable (
  id uuid primary key default uuid_generate_v4(),
  class_subject_mapping_id uuid not null references class_subject_mapping(id),
  day text not null check (day in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
  start_time time not null, end_time time not null, room text,
  is_active boolean default true,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  constraint uq_tt_slot unique (class_subject_mapping_id, day, start_time)
);

-- HOLIDAYS
create table if not exists holidays (
  id uuid primary key default uuid_generate_v4(),
  academic_year_id uuid references academic_years(id),
  date date not null unique, name text not null,
  type text default 'holiday' check (type in ('holiday','exam','event','special')),
  description text, created_at timestamptz default now()
);

-- ATTENDANCE SESSIONS
create table if not exists attendance_sessions (
  id uuid primary key default uuid_generate_v4(),
  class_subject_mapping_id uuid not null references class_subject_mapping(id),
  timetable_id uuid references timetable(id),
  date date not null, start_time time, end_time time,
  faculty_id uuid not null references faculty(id),
  substitute_id uuid references faculty(id),
  is_extra boolean default false,
  total_students int default 0, present_count int default 0, absent_count int default 0,
  status text default 'draft' check (status in ('draft','completed','locked')),
  notes text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  constraint uq_session unique (class_subject_mapping_id, date)
);

-- ATTENDANCE RECORDS
create table if not exists attendance_records (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references attendance_sessions(id) on delete cascade,
  student_id uuid not null references students(id),
  roll_no text not null,
  status text not null check (status in ('P','A','L','OD')),
  marked_by uuid references faculty(id), marked_at timestamptz default now(),
  is_active boolean default true,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  constraint uq_rec_session unique (session_id, student_id)
);

-- ATTENDANCE CORRECTIONS
create table if not exists attendance_corrections (
  id uuid primary key default uuid_generate_v4(),
  record_id uuid not null references attendance_records(id),
  session_id uuid not null references attendance_sessions(id),
  student_id uuid not null references students(id),
  old_status text, new_status text, reason text not null,
  requested_by uuid not null references faculty(id),
  approved_by uuid references faculty(id),
  status text default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now(), updated_at timestamptz default now()
);

-- FACULTY SUBSTITUTIONS
create table if not exists faculty_substitutions (
  id uuid primary key default uuid_generate_v4(),
  class_subject_mapping_id uuid not null references class_subject_mapping(id),
  original_faculty_id uuid not null references faculty(id),
  substitute_faculty_id uuid not null references faculty(id),
  date date not null, reason text,
  status text default 'active' check (status in ('active','expired','cancelled')),
  created_at timestamptz default now(), updated_at timestamptz default now()
);

-- SUBJECT COVERAGE
create table if not exists subject_coverage (
  id uuid primary key default uuid_generate_v4(),
  class_subject_mapping_id uuid not null references class_subject_mapping(id),
  unit_number int not null, unit_title text not null,
  topics_planned int default 0, topics_completed int default 0,
  notes text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  constraint uq_coverage unique (class_subject_mapping_id, unit_number)
);

-- NOTIFICATIONS
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references faculty(id),
  title text not null, body text,
  type text default 'info' check (type in ('info','warning','error','reminder')),
  is_read boolean default false, action_url text,
  created_at timestamptz default now()
);

-- APP SETTINGS
create table if not exists app_settings (
  key text primary key, value jsonb not null, description text,
  updated_by uuid references faculty(id), updated_at timestamptz default now()
);

-- AUDIT LOGS
create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  table_name text not null, record_id uuid, action text not null,
  old_data jsonb, new_data jsonb,
  performed_by uuid references faculty(id),
  ip_address text, created_at timestamptz default now()
);

-- TRIGGERS
do $$ declare t text; begin
  foreach t in array array['departments','faculty','semesters','classes','subjects',
    'students','class_subject_mapping','timetable','attendance_sessions',
    'attendance_records','attendance_corrections','faculty_substitutions','subject_coverage'] loop
    execute format('drop trigger if exists trg_%s_upd on %s; create trigger trg_%s_upd before update on %s for each row execute procedure ax_set_updated_at();', t,t,t,t);
  end loop;
end $$;

-- INDEXES
create index if not exists idx_faculty_auth     on faculty(auth_id);
create index if not exists idx_faculty_dept     on faculty(department_id, role);
create index if not exists idx_students_class   on students(class_id, is_active);
create index if not exists idx_students_roll    on students(roll_no);
create index if not exists idx_csm_faculty      on class_subject_mapping(faculty_id, semester_id);
create index if not exists idx_csm_class        on class_subject_mapping(class_id, semester_id);
create index if not exists idx_tt_day           on timetable(day, start_time);
create index if not exists idx_sess_date        on attendance_sessions(date, status);
create index if not exists idx_sess_faculty     on attendance_sessions(faculty_id, date);
create index if not exists idx_rec_session      on attendance_records(session_id);
create index if not exists idx_rec_student      on attendance_records(student_id, status);
create index if not exists idx_holidays_date    on holidays(date);
create index if not exists idx_notif_user       on notifications(user_id, is_read, created_at);
create index if not exists idx_stu_name_trgm    on students using gin(name gin_trgm_ops);
create index if not exists idx_fac_name_trgm    on faculty using gin(name gin_trgm_ops);

-- RLS
do $$ declare t text; begin
  foreach t in array array['departments','faculty','academic_years','semesters','classes','subjects',
    'students','class_subject_mapping','timetable','holidays','attendance_sessions',
    'attendance_records','attendance_corrections','faculty_substitutions',
    'subject_coverage','notifications','audit_logs','app_settings'] loop
    execute format('alter table %s enable row level security;', t);
    execute format('drop policy if exists "auth_all_%s" on %s; create policy "auth_all_%s" on %s for all to authenticated using (true) with check (true);', t,t,t,t);
  end loop;
  drop policy if exists "anon_read_faculty" on faculty;
  create policy "anon_read_faculty" on faculty for select to anon using (is_active = true);
end $$;

-- REALTIME
do $$ declare t text; begin
  foreach t in array array['attendance_sessions','attendance_records','notifications'] loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename=t)
    then execute format('alter publication supabase_realtime add table %s;', t); end if;
  end loop;
end $$;

-- VIEWS
create or replace view vw_student_attendance_summary as
select ar.student_id, s.roll_no, s.name as student_name, s.class_id,
  sess.class_subject_mapping_id,
  sub.name as subject_name, sub.code as subject_code,
  count(*) filter (where ar.status in ('P','L','OD')) as present_count,
  count(*) filter (where ar.status = 'A') as absent_count,
  count(*) as total_classes,
  round(count(*) filter (where ar.status in ('P','L','OD'))::numeric / nullif(count(*),0)*100,2) as attendance_pct
from attendance_records ar
join attendance_sessions sess on sess.id = ar.session_id
join students s on s.id = ar.student_id
join class_subject_mapping csm on csm.id = sess.class_subject_mapping_id
join subjects sub on sub.id = csm.subject_id
where sess.status = 'completed' and ar.is_active = true
group by ar.student_id, s.roll_no, s.name, s.class_id, sess.class_subject_mapping_id, sub.name, sub.code;

create or replace view vw_faculty_workload as
select f.id as faculty_id, f.name as faculty_name, f.employee_id, d.name as department,
  count(distinct csm.id) as assigned_subjects,
  count(distinct sess.id) filter (where sess.status = 'completed') as sessions_completed,
  count(distinct sess.id) as sessions_total,
  round(count(distinct sess.id) filter (where sess.status='completed')::numeric / nullif(count(distinct sess.id),0)*100,2) as completion_rate
from faculty f
left join departments d on d.id = f.department_id
left join class_subject_mapping csm on csm.faculty_id = f.id and csm.is_active = true
left join attendance_sessions sess on sess.class_subject_mapping_id = csm.id
group by f.id, f.name, f.employee_id, d.name;

create or replace view vw_low_attendance as
select *, case when attendance_pct < 50 then 'critical' when attendance_pct < 65 then 'danger' when attendance_pct < 75 then 'warning' else 'ok' end as alert_level
from vw_student_attendance_summary where attendance_pct < 75;
