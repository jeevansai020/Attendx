-- ═══════════════════════════════════════════════════════════════
--  AttendX – Password Sync & Account Fix
--  Run in Supabase SQL Editor when passwords need resetting.
--  Safe to run multiple times.
-- ═══════════════════════════════════════════════════════════════

-- Upsert all faculty accounts with correct passwords
insert into faculty (id, name, username, password, department, role, status, is_active) values
  ('dr.kumar',   'Dr. Ramesh Kumar',   'dr.kumar',   'Faculty@123', 'CSE', 'faculty', 'active', true),
  ('prof.meena', 'Prof. Meena Sharma', 'prof.meena', 'Faculty@123', 'ECE', 'faculty', 'active', true),
  ('hod.cse',    'Dr. Anitha Rao',     'hod.cse',    'Hod@12345',   'CSE', 'hod',     'active', true),
  ('admin',      'Administrator',       'admin',       'Admin@123',   'All', 'admin',   'active', true),
  ('dean',       'Dr. Suresh Nair',     'dean',        'Dean@12345',  'All', 'dean',    'active', true)
on conflict (id) do update set
  password  = excluded.password,
  role      = excluded.role,
  status    = excluded.status,
  is_active = excluded.is_active;

-- Also fix by username (in case IDs differ)
update faculty set password = 'Faculty@123', is_active = true where username = 'dr.kumar';
update faculty set password = 'Faculty@123', is_active = true where username = 'prof.meena';
update faculty set password = 'Admin@123',   is_active = true where username = 'admin';
update faculty set password = 'Hod@12345',   is_active = true where username = 'hod.cse';
update faculty set password = 'Dean@12345',  is_active = true where username = 'dean';

-- Verify result
select id, name, username, length(password) as pwd_len, role, is_active
from faculty
order by role, name;
