-- AttendX Seed Data v2.0 — run AFTER schema.sql
-- All inserts use ON CONFLICT DO NOTHING (idempotent)

-- 1. ACADEMIC YEAR
insert into academic_years (id, label, start_date, end_date, is_current) values
  ('a0000000-0000-0000-0000-000000000001','2025-26','2025-06-01','2026-05-31', true)
on conflict (label) do nothing;

-- 2. SEMESTER
insert into semesters (id, academic_year_id, name, semester_number, start_date, end_date, is_current, status) values
  ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','Odd 2025',1,'2025-06-01','2025-11-30', true,'active')
on conflict (academic_year_id, name) do nothing;

-- 3. DEPARTMENTS
insert into departments (id, name, code) values
  ('d0000000-0000-0000-0000-000000000001','Computer Science & Engineering','CSE'),
  ('d0000000-0000-0000-0000-000000000002','Electronics & Communication','ECE'),
  ('d0000000-0000-0000-0000-000000000003','Mechanical Engineering','MECH')
on conflict (code) do nothing;

-- 4. FACULTY (passwords handled via Supabase Auth — employee_id used as username)
-- NOTE: Create these users in Supabase Auth dashboard, then link auth_id here
insert into faculty (id, employee_id, name, email, department_id, role, designation) values
  ('f0000000-0000-0000-0000-000000000001','FAC001','Dr. Ramesh Kumar','dr.kumar@college.edu','d0000000-0000-0000-0000-000000000001','faculty','Associate Professor'),
  ('f0000000-0000-0000-0000-000000000002','FAC002','Prof. Meena Sharma','prof.meena@college.edu','d0000000-0000-0000-0000-000000000002','faculty','Assistant Professor'),
  ('f0000000-0000-0000-0000-000000000003','ADM001','Admin User','admin@college.edu',null,'admin','System Administrator'),
  ('f0000000-0000-0000-0000-000000000004','HOD001','Dr. Anitha Rao','hod.cse@college.edu','d0000000-0000-0000-0000-000000000001','hod','Professor & HOD'),
  ('f0000000-0000-0000-0000-000000000005','DEAN001','Dr. Suresh Nair','dean@college.edu',null,'dean','Dean of Academics')
on conflict (employee_id) do nothing;

-- 5. CLASSES
insert into classes (id, semester_id, department_id, year, section, strength) values
  ('c0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','3rd Year','A',62),
  ('c0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','3rd Year','B',58),
  ('c0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','2nd Year','A',65),
  ('c0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','1st Year','A',70),
  ('c0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','4th Year','A',55)
on conflict (semester_id, department_id, year, section) do nothing;

-- 6. SUBJECTS
insert into subjects (id, semester_id, department_id, name, code, year_applicable, credits, total_hours) values
  ('s0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','Computer Networks','CS301','3rd Year',4,60),
  ('s0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','Operating Systems','CS302','3rd Year',4,60),
  ('s0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','Database Management Systems','CS303','3rd Year',4,60),
  ('s0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','Software Engineering','CS304','3rd Year',3,45),
  ('s0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','Data Structures','CS201','2nd Year',4,60),
  ('s0000000-0000-0000-0000-000000000006','b0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','Programming in C','CS101','1st Year',4,60),
  ('s0000000-0000-0000-0000-000000000007','b0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','Machine Learning','CS401','4th Year',4,60),
  ('s0000000-0000-0000-0000-000000000008','b0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','Theory of Computation','CS305','3rd Year',3,45)
on conflict (semester_id, code) do nothing;

-- 7. CLASS-SUBJECT-FACULTY MAPPING
insert into class_subject_mapping (id, semester_id, class_id, subject_id, faculty_id) values
  ('m0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','s0000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000001'),
  ('m0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','s0000000-0000-0000-0000-000000000003','f0000000-0000-0000-0000-000000000001'),
  ('m0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002','s0000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000001'),
  ('m0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000003','s0000000-0000-0000-0000-000000000005','f0000000-0000-0000-0000-000000000001'),
  ('m0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000004','s0000000-0000-0000-0000-000000000006','f0000000-0000-0000-0000-000000000001'),
  ('m0000000-0000-0000-0000-000000000006','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000005','s0000000-0000-0000-0000-000000000007','f0000000-0000-0000-0000-000000000001'),
  ('m0000000-0000-0000-0000-000000000007','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','s0000000-0000-0000-0000-000000000002','f0000000-0000-0000-0000-000000000002'),
  ('m0000000-0000-0000-0000-000000000008','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','s0000000-0000-0000-0000-000000000008','f0000000-0000-0000-0000-000000000002')
on conflict (semester_id, class_id, subject_id) do nothing;

-- 8. TIMETABLE (Dr. Kumar)
insert into timetable (id, class_subject_mapping_id, day, start_time, end_time) values
  ('t0000001','m0000000-0000-0000-0000-000000000001','Monday','09:00','10:00'),
  ('t0000002','m0000000-0000-0000-0000-000000000002','Monday','10:00','11:00'),
  ('t0000003','m0000000-0000-0000-0000-000000000004','Monday','11:00','12:00'),
  ('t0000004','m0000000-0000-0000-0000-000000000005','Monday','14:00','15:00'),
  ('t0000005','m0000000-0000-0000-0000-000000000001','Tuesday','09:00','10:00'),
  ('t0000006','m0000000-0000-0000-0000-000000000003','Tuesday','10:00','11:00'),
  ('t0000007','m0000000-0000-0000-0000-000000000006','Tuesday','14:00','15:00'),
  ('t0000008','m0000000-0000-0000-0000-000000000001','Wednesday','09:00','10:00'),
  ('t0000009','m0000000-0000-0000-0000-000000000002','Wednesday','10:00','11:00'),
  ('t0000010','m0000000-0000-0000-0000-000000000004','Wednesday','11:00','12:00'),
  ('t0000011','m0000000-0000-0000-0000-000000000001','Thursday','09:00','10:00'),
  ('t0000012','m0000000-0000-0000-0000-000000000003','Thursday','10:00','11:00'),
  ('t0000013','m0000000-0000-0000-0000-000000000005','Thursday','14:00','15:00'),
  ('t0000014','m0000000-0000-0000-0000-000000000001','Friday','09:00','10:00'),
  ('t0000015','m0000000-0000-0000-0000-000000000002','Friday','10:00','11:00'),
  ('t0000016','m0000000-0000-0000-0000-000000000006','Friday','14:00','15:00')
on conflict (class_subject_mapping_id, day, start_time) do nothing;

-- 9. APP SETTINGS
insert into app_settings (key, value, description) values
  ('college_name', '"Government College of Engineering"', 'Institution name'),
  ('college_code', '"GCE001"', 'Institution code'),
  ('min_attendance_pct', '75', 'Minimum required attendance percentage'),
  ('warning_threshold', '80', 'Warning threshold percentage'),
  ('academic_year_id', '"a0000000-0000-0000-0000-000000000001"', 'Current academic year'),
  ('semester_id', '"b0000000-0000-0000-0000-000000000001"', 'Current semester')
on conflict (key) do nothing;

-- 10. STUDENTS (35 per class using PL/pgSQL)
do $$
declare
  fnames text[] := array['Aarav','Vikram','Priya','Ananya','Rahul','Kavitha','Siddharth','Nithya','Arjun','Divya','Karthik','Sneha','Arun','Pooja','Suresh','Lakshmi','Varun','Meghna','Rajan','Swetha','Deepak','Aishwarya','Naveen','Keerthi','Prasad','Revathi','Vijay','Saranya','Harish','Lavanya','Mohan','Soundarya','Balaji','Tamilarasi','Senthil'];
  lnames text[] := array['Kumar','Sharma','Patel','Singh','Reddy','Nair','Pillai','Krishnan','Murugan','Subramaniam'];
  classes_data record; i int; rno text; sid uuid;
begin
  for classes_data in
    select id, semester_id, department_id,
      case year when '1st Year' then '1' when '2nd Year' then '2' when '3rd Year' then '3' when '4th Year' then '4' end as yr_num,
      section
    from classes
    where semester_id = 'b0000000-0000-0000-0000-000000000001'
  loop
    for i in 1..35 loop
      rno := classes_data.yr_num || classes_data.section || lpad(i::text,3,'0');
      sid := uuid_generate_v4();
      insert into students (id, roll_no, name, class_id, semester_id, department_id, batch)
        values (
          sid, rno,
          fnames[1 + ((i + 3) % array_length(fnames,1))] || ' ' ||
          lnames[1 + ((i + 2) % array_length(lnames,1))],
          classes_data.id, classes_data.semester_id, classes_data.department_id, '2022-26'
        )
      on conflict (semester_id, roll_no) do nothing;
    end loop;
  end loop;
end $$;
