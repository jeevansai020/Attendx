-- ═══════════════════════════════════════════════
--  AttendX – Seed Data v1.1 (Fixed)
--  Run AFTER supabase_schema.sql
--  All inserts are idempotent (ON CONFLICT DO NOTHING)
-- ═══════════════════════════════════════════════

-- ── FACULTY ──────────────────────────────────
insert into faculty (id, name, username, password, department, role, status, is_active) values
  ('dr.kumar',    'Dr. Ramesh Kumar',    'dr.kumar',    'Faculty@123', 'CSE', 'faculty', 'active', true),
  ('prof.meena',  'Prof. Meena Sharma',  'prof.meena',  'Faculty@123', 'ECE', 'faculty', 'active', true),
  ('hod.cse',     'Dr. Anitha Rao',      'hod.cse',     'Hod@12345',   'CSE', 'hod',     'active', true),
  ('admin',       'Administrator',        'admin',        'Admin@123',   'All', 'admin',   'active', true),
  ('dean',        'Dr. Suresh Nair',      'dean',         'Dean@12345',  'All', 'dean',    'active', true)
on conflict (id) do update set
  password   = excluded.password,
  role       = excluded.role,
  is_active  = excluded.is_active,
  status     = excluded.status;

-- ── CLASSES ──────────────────────────────────
insert into classes (id, year, section, department, strength, is_active) values
  ('class_1_A','1st Year','A','CSE',42,true),('class_1_B','1st Year','B','CSE',40,true),('class_1_C','1st Year','C','CSE',38,true),
  ('class_2_A','2nd Year','A','CSE',41,true),('class_2_B','2nd Year','B','CSE',39,true),('class_2_C','2nd Year','C','CSE',37,true),
  ('class_3_A','3rd Year','A','CSE',43,true),('class_3_B','3rd Year','B','CSE',40,true),('class_3_C','3rd Year','C','CSE',36,true),
  ('class_4_A','4th Year','A','CSE',38,true),('class_4_B','4th Year','B','CSE',35,true),('class_4_C','4th Year','C','CSE',33,true)
on conflict (id) do nothing;

-- ── SUBJECTS ─────────────────────────────────
insert into subjects (id, name, code, year_applicable, credits, is_active) values
  ('sub_1_1','Engineering Mathematics-I',    'EM101','1st Year',4,true),
  ('sub_1_2','Engineering Physics',           'EP101','1st Year',3,true),
  ('sub_1_3','Engineering Chemistry',         'EC101','1st Year',3,true),
  ('sub_1_4','Programming in C',             'CS101','1st Year',4,true),
  ('sub_1_5','Engineering Drawing',          'ME101','1st Year',3,true),
  ('sub_1_6','English Communication',        'EN101','1st Year',3,true),
  ('sub_2_1','Mathematics-III',              'MA201','2nd Year',4,true),
  ('sub_2_2','Data Structures',              'CS201','2nd Year',4,true),
  ('sub_2_3','Digital Electronics',          'EC201','2nd Year',3,true),
  ('sub_2_4','Object Oriented Programming',  'CS202','2nd Year',4,true),
  ('sub_2_5','Computer Organization',        'CS203','2nd Year',3,true),
  ('sub_2_6','Environment Science',          'ES201','2nd Year',2,true),
  ('sub_3_1','Computer Networks',            'CS301','3rd Year',4,true),
  ('sub_3_2','Operating Systems',            'CS302','3rd Year',4,true),
  ('sub_3_3','Database Management Systems',  'CS303','3rd Year',4,true),
  ('sub_3_4','Software Engineering',         'CS304','3rd Year',3,true),
  ('sub_3_5','Theory of Computation',        'CS305','3rd Year',3,true),
  ('sub_3_6','Web Technologies',             'CS306','3rd Year',3,true),
  ('sub_4_1','Machine Learning',             'CS401','4th Year',4,true),
  ('sub_4_2','Cloud Computing',              'CS402','4th Year',3,true),
  ('sub_4_3','Cyber Security',               'CS403','4th Year',3,true),
  ('sub_4_4','Big Data Analytics',           'CS404','4th Year',3,true),
  ('sub_4_5','Project Work',                 'CS405','4th Year',6,true),
  ('sub_4_6','Professional Elective',        'CS406','4th Year',3,true)
on conflict (id) do nothing;

-- ── STUDENTS (35 per class, generated) ───────
do $$
declare
  yr_nums   text[]  := array['1','2','3','4'];
  yr_labels text[]  := array['1st Year','2nd Year','3rd Year','4th Year'];
  secs      text[]  := array['A','B','C'];
  fnames    text[]  := array['Aarav','Vikram','Priya','Ananya','Rahul','Kavitha','Siddharth','Nithya','Arjun','Divya',
                              'Karthik','Sneha','Arun','Pooja','Suresh','Lakshmi','Varun','Meghna','Rajan','Swetha',
                              'Deepak','Aishwarya','Naveen','Keerthi','Prasad','Revathi','Vijay','Saranya','Harish',
                              'Lavanya','Mohan','Soundarya','Balaji','Tamilarasi','Senthil'];
  lnames    text[]  := array['Kumar','Sharma','Patel','Singh','Reddy','Nair','Pillai','Krishnan','Murugan','Subramaniam'];
  y int; s int; i int;
  cid text; rno text; sid text; fn text; ln text;
begin
  for y in 1..4 loop
    for s in 1..3 loop
      cid := 'class_' || yr_nums[y] || '_' || secs[s];
      for i in 1..35 loop
        rno := yr_nums[y] || secs[s] || lpad(i::text,3,'0');
        sid := 'stu_' || yr_nums[y] || secs[s] || lpad(i::text,3,'0');
        fn  := fnames[1 + ((y*11 + s*7 + i) % array_length(fnames,1))];
        ln  := lnames[1 + ((i + s*3)         % array_length(lnames,1))];
        insert into students(id, roll_no, name, class_id, department, status, is_active)
          values(sid, rno, fn||' '||ln, cid, 'CSE', 'active', true)
          on conflict(id) do nothing;
      end loop;
    end loop;
  end loop;
end $$;

-- ── TIMETABLE (dr.kumar, Mon–Fri) ────────────
insert into timetable (id, faculty_id, class_id, subject_id, day, start_time, end_time, is_active) values
  ('tt_mon_1','dr.kumar','class_3_A','sub_3_1','Monday','09:00','10:00',true),
  ('tt_mon_2','dr.kumar','class_3_A','sub_3_3','Monday','10:00','11:00',true),
  ('tt_mon_3','dr.kumar','class_2_A','sub_2_2','Monday','11:00','12:00',true),
  ('tt_mon_4','dr.kumar','class_1_A','sub_1_4','Monday','14:00','15:00',true),
  ('tt_mon_5','dr.kumar','class_3_B','sub_3_1','Monday','15:00','16:00',true),
  ('tt_tue_1','dr.kumar','class_3_B','sub_3_1','Tuesday','09:00','10:00',true),
  ('tt_tue_2','dr.kumar','class_2_B','sub_2_2','Tuesday','10:00','11:00',true),
  ('tt_tue_3','dr.kumar','class_4_A','sub_4_1','Tuesday','14:00','15:00',true),
  ('tt_tue_4','dr.kumar','class_1_B','sub_1_4','Tuesday','15:00','16:00',true),
  ('tt_wed_1','dr.kumar','class_2_A','sub_2_2','Wednesday','09:00','10:00',true),
  ('tt_wed_2','dr.kumar','class_3_A','sub_3_1','Wednesday','10:00','11:00',true),
  ('tt_wed_3','dr.kumar','class_4_A','sub_4_1','Wednesday','11:00','12:00',true),
  ('tt_wed_4','dr.kumar','class_1_A','sub_1_4','Wednesday','14:00','15:00',true),
  ('tt_wed_5','dr.kumar','class_3_B','sub_3_3','Wednesday','15:00','16:00',true),
  ('tt_thu_1','dr.kumar','class_3_A','sub_3_3','Thursday','09:00','10:00',true),
  ('tt_thu_2','dr.kumar','class_2_A','sub_2_4','Thursday','10:00','11:00',true),
  ('tt_thu_3','dr.kumar','class_1_A','sub_1_4','Thursday','11:00','12:00',true),
  ('tt_thu_4','dr.kumar','class_4_A','sub_4_2','Thursday','14:00','15:00',true),
  ('tt_thu_5','dr.kumar','class_3_A','sub_3_1','Thursday','15:00','16:00',true),
  ('tt_fri_1','dr.kumar','class_1_A','sub_1_4','Friday','09:00','10:00',true),
  ('tt_fri_2','dr.kumar','class_3_A','sub_3_1','Friday','10:00','11:00',true),
  ('tt_fri_3','dr.kumar','class_2_A','sub_2_2','Friday','11:00','12:00',true),
  ('tt_fri_4','dr.kumar','class_3_B','sub_3_1','Friday','14:00','15:00',true)
on conflict (id) do nothing;

-- ── PROF. MEENA TIMETABLE ─────────────────────
insert into timetable (id, faculty_id, class_id, subject_id, day, start_time, end_time, is_active) values
  ('tt_meena_mon_1','prof.meena','class_3_A','sub_3_2','Monday','09:00','10:00',true),
  ('tt_meena_mon_2','prof.meena','class_3_A','sub_3_5','Monday','10:00','11:00',true),
  ('tt_meena_tue_1','prof.meena','class_3_B','sub_3_2','Tuesday','09:00','10:00',true),
  ('tt_meena_wed_1','prof.meena','class_3_A','sub_3_2','Wednesday','09:00','10:00',true),
  ('tt_meena_thu_1','prof.meena','class_3_B','sub_3_5','Thursday','10:00','11:00',true),
  ('tt_meena_fri_1','prof.meena','class_3_B','sub_3_2','Friday','09:00','10:00',true)
on conflict (id) do nothing;

-- ── DONE ──────────────────────────────────────
-- Verify data:
-- select id, name, username, role, is_active from faculty;
-- select count(*) from students;
-- select count(*) from timetable where is_active = true;
