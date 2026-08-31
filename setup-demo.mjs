import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vddccefwieqnfitmxtjh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZGNjZWZ3aWVxbmZpdG14dGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2Nzc1NzAsImV4cCI6MjA3NzI1MzU3MH0.fMBo_l4xE81I8spvc4qXl31u4SqYNktRjCAC6vbu540';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('🎓 ArchEdu Demo Data Setup Script');
  console.log('==================================\n');

  // Step 1: Login as admin
  console.log('1️⃣  Logging in as admin...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'littlestars@gmail.com',
    password: 'Ramrak16@!'
  });
  if (authError) { console.error('❌ Login failed:', authError.message); return; }
  const adminUserId = authData.user.id;
  console.log('✅ Logged in as admin:', adminUserId);

  // Step 2: Get school info via user_roles
  console.log('\n2️⃣  Getting school info...');
  const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', adminUserId).single();
  if (!roleData) { console.error('❌ No role record found'); return; }
  const schoolId = roleData.school_id;
  console.log('✅ School ID:', schoolId);

  // Step 3: Get classes
  console.log('\n3️⃣  Getting classes...');
  const { data: classes } = await supabase.from('classes').select('*').eq('school_id', schoolId);
  console.log('✅ Classes:', classes?.map(c => `${c.name}-${c.section}`).join(', '));

  const grade1 = classes?.find(c => c.name === 'Grade 1' && c.section === 'A');
  if (!grade1) { console.error('❌ Grade 1-A not found'); return; }

  // Step 4: Get subjects
  console.log('\n4️⃣  Getting subjects...');
  const { data: subjects } = await supabase.from('subjects').select('*').eq('school_id', schoolId);
  console.log('✅ Subjects:', subjects?.map(s => s.name).join(', '));

  // Step 5: Get students
  console.log('\n5️⃣  Getting students...');
  const { data: allStudents } = await supabase.from('students').select('*').eq('school_id', schoolId);
  console.log('✅ Students found:', allStudents?.length);

  // Step 6: Get teachers
  console.log('\n6️⃣  Getting teachers...');
  const { data: teachers } = await supabase.from('teachers').select('*').eq('school_id', schoolId);
  const teacherUserIds = teachers?.map(t => t.user_id) || [];
  const { data: teacherProfiles } = await supabase.from('profiles').select('*').in('id', teacherUserIds.length > 0 ? teacherUserIds : ['none']);
  console.log('✅ Teachers:', teacherProfiles?.map(p => p.full_name).join(', '));

  // Step 7: Enroll students in Grade 1-A (if not already enrolled)
  console.log('\n7️⃣  Checking enrollment...');
  const { data: existingEnrollment } = await supabase.from('class_students').select('*').eq('class_id', grade1.id);
  
  if (existingEnrollment && existingEnrollment.length > 0) {
    console.log(`✅ Already enrolled: ${existingEnrollment.length} students`);
  } else if (allStudents && allStudents.length > 0) {
    const enrollments = allStudents.map(s => ({
      class_id: grade1.id,
      student_id: s.user_id,
    }));
    const { error: enrollError } = await supabase.from('class_students').insert(enrollments);
    if (enrollError) console.error('❌ Enrollment error:', enrollError.message);
    else console.log(`✅ Enrolled ${enrollments.length} students in Grade 1-A`);
  }

  // Re-fetch enrollment
  const { data: classStudents } = await supabase.from('class_students').select('*').eq('class_id', grade1.id);
  const studentIds = classStudents?.map(cs => cs.student_id) || [];
  console.log(`✅ Students in Grade 1-A: ${studentIds.length}`);

  // Helper: find teacher by name
  const findTeacher = (namePart) => {
    const t = teachers?.find(t => {
      const p = teacherProfiles?.find(p => p.id === t.user_id);
      return p?.full_name?.includes(namePart);
    });
    return t?.user_id || teachers?.[0]?.user_id;
  };

  const mathSubject = subjects?.find(s => s.name === 'Mathematics');
  const engSubject = subjects?.find(s => s.name === 'English');
  const hindiSubject = subjects?.find(s => s.name === 'Hindi');
  const sciSubject = subjects?.find(s => s.name === 'Science');

  // ============================================================
  // TIMETABLE — day_of_week is NUMBER (0-6), no school_id, no period_number
  // ============================================================
  console.log('\n8️⃣  Setting up timetable...');
  const { data: existingTT } = await supabase.from('timetable').select('id').eq('class_id', grade1.id).limit(1);

  if (existingTT && existingTT.length > 0) {
    console.log('⚠️  Timetable exists, skipping');
  } else if (mathSubject && engSubject && hindiSubject && sciSubject) {
    const periods = [
      { start: '09:00', end: '09:45' },
      { start: '09:45', end: '10:30' },
      { start: '10:45', end: '11:30' },
      { start: '11:30', end: '12:15' },
      { start: '13:00', end: '13:45' },
      { start: '13:45', end: '14:30' },
    ];

    // day_of_week: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
    const rotation = [
      [mathSubject, engSubject, sciSubject, hindiSubject, mathSubject, engSubject],
      [engSubject, sciSubject, mathSubject, engSubject, hindiSubject, sciSubject],
      [sciSubject, mathSubject, hindiSubject, sciSubject, engSubject, mathSubject],
      [hindiSubject, engSubject, mathSubject, sciSubject, mathSubject, hindiSubject],
      [mathSubject, hindiSubject, engSubject, mathSubject, sciSubject, engSubject],
    ];

    const teacherForSubject = {
      [mathSubject.id]: findTeacher('Rajesh'),
      [engSubject.id]: findTeacher('Priya'),
      [hindiSubject.id]: findTeacher('Sunita'),
      [sciSubject.id]: findTeacher('Amit'),
    };

    const entries = [];
    for (let d = 0; d < 5; d++) {
      for (let p = 0; p < periods.length; p++) {
        const subj = rotation[d][p];
        entries.push({
          class_id: grade1.id,
          subject_id: subj.id,
          teacher_id: teacherForSubject[subj.id],
          day_of_week: d + 1,
          start_time: periods[p].start,
          end_time: periods[p].end,
        });
      }
    }

    const { error } = await supabase.from('timetable').insert(entries);
    if (error) console.error('❌ Timetable error:', error.message);
    else console.log(`✅ Created ${entries.length} timetable entries`);
  }

  // ============================================================
  // ATTENDANCE — two tables: attendance (header) + attendance_details (rows)
  // ============================================================
  console.log('\n9️⃣  Setting up attendance...');
  const { data: existingAtt } = await supabase.from('attendance').select('id').eq('class_id', grade1.id).limit(1);

  if (existingAtt && existingAtt.length > 0) {
    console.log('⚠️  Attendance exists, skipping');
  } else if (studentIds.length > 0) {
    const today = new Date();
    let totalRecords = 0;
    
    for (let offset = 1; offset <= 10; offset++) {
      const date = new Date(today);
      date.setDate(date.getDate() - offset);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      const dateStr = date.toISOString().split('T')[0];
      
      // Create attendance header
      const { data: attHeader, error: attErr } = await supabase
        .from('attendance')
        .insert({ class_id: grade1.id, date: dateStr, submitted_by: adminUserId })
        .select()
        .single();

      if (attErr) { console.error(`❌ Attendance header error (${dateStr}):`, attErr.message); continue; }
      
      // Create attendance details for each student
      const details = studentIds.map(sid => ({
        attendance_id: attHeader.id,
        student_id: sid,
        status: Math.random() < 0.90 ? 'present' : 'absent',
      }));

      const { error: detErr } = await supabase.from('attendance_details').insert(details);
      if (detErr) console.error(`❌ Details error (${dateStr}):`, detErr.message);
      else totalRecords += details.length;
    }
    
    console.log(`✅ Created attendance for ${totalRecords} student-days`);
  } else {
    console.log('⚠️  No students enrolled, skipping');
  }

  // ============================================================
  // HOMEWORK — no school_id, no status columns
  // ============================================================
  console.log('\n🔟  Setting up homework...');
  const { data: existingHW } = await supabase.from('homework').select('id').eq('class_id', grade1.id).limit(1);

  if (existingHW && existingHW.length > 0) {
    console.log('⚠️  Homework exists, skipping');
  } else {
    const today = new Date();
    let totalHW = 0;

    // Each teacher must insert their own homework (RLS: teacher_id = auth.uid())
    const hwByTeacher = [
      { name: 'Rajesh', email: teacherProfiles?.find(p => p.full_name?.includes('Rajesh'))?.email,
        items: mathSubject ? [
          { class_id: grade1.id, subject_id: mathSubject.id, title: 'Addition and Subtraction Practice',
            description: 'Complete exercises 1-20 from Chapter 5. Show all working steps clearly.',
            due_date: new Date(today.getTime() + 3*86400000).toISOString() },
          { class_id: grade1.id, subject_id: mathSubject.id, title: 'Number Patterns Worksheet',
            description: 'Complete the number pattern worksheet. Identify and continue each pattern.',
            due_date: new Date(today.getTime() + 5*86400000).toISOString() },
        ] : [] },
      { name: 'Priya', email: teacherProfiles?.find(p => p.full_name?.includes('Priya'))?.email,
        items: engSubject ? [
          { class_id: grade1.id, subject_id: engSubject.id, title: 'Write a Short Essay: My Best Friend',
            description: 'Write a 100-word essay about your best friend.',
            due_date: new Date(today.getTime() + 4*86400000).toISOString() },
        ] : [] },
      { name: 'Amit', email: teacherProfiles?.find(p => p.full_name?.includes('Amit'))?.email,
        items: sciSubject ? [
          { class_id: grade1.id, subject_id: sciSubject.id, title: 'Label the Parts of a Plant',
            description: 'Draw a plant and label: roots, stem, leaves, flower, and fruit.',
            due_date: new Date(today.getTime() + 2*86400000).toISOString() },
        ] : [] },
      { name: 'Sunita', email: teacherProfiles?.find(p => p.full_name?.includes('Sunita'))?.email,
        items: hindiSubject ? [
          { class_id: grade1.id, subject_id: hindiSubject.id, title: 'Hindi Varnamala Practice',
            description: 'Write each Hindi consonant 5 times with one example word for each.',
            due_date: new Date(today.getTime() + 6*86400000).toISOString() },
        ] : [] },
    ];

    for (const teacher of hwByTeacher) {
      if (!teacher.email || teacher.items.length === 0) continue;
      await supabase.auth.signOut();
      const { data: tAuth, error: tErr } = await supabase.auth.signInWithPassword({ email: teacher.email, password: 'Teacher@123' });
      if (tErr) { console.error(`  ❌ ${teacher.name} login failed`); continue; }
      
      const entries = teacher.items.map(item => ({ ...item, teacher_id: tAuth.user.id }));
      const { error } = await supabase.from('homework').insert(entries);
      if (error) console.error(`  ❌ ${teacher.name} homework error:`, error.message);
      else totalHW += entries.length;
    }
    
    console.log(`✅ Created ${totalHW} homework assignments`);
    
    // Re-login as admin
    await supabase.auth.signOut();
    await supabase.auth.signInWithPassword({ email: 'littlestars@gmail.com', password: 'Ramrak16@!' });
  }

  // ============================================================
  // EXAMS — uses exam_name (not name), no academic_year, no status
  // ============================================================
  console.log('\n1️⃣1️⃣ Setting up exams...');
  const { data: existingExams } = await supabase.from('exams').select('id').eq('school_id', schoolId).limit(1);

  if (existingExams && existingExams.length > 0) {
    console.log('⚠️  Exams exist, skipping');
  } else {
    const exams = [
      { school_id: schoolId, exam_name: 'Unit Test 1', exam_type: 'Unit Test', start_date: '2026-03-15', end_date: '2026-03-18', class_id: grade1.id, created_by: adminUserId },
      { school_id: schoolId, exam_name: 'Mid-Term Examination', exam_type: 'Mid Term', start_date: '2026-04-10', end_date: '2026-04-15', class_id: grade1.id, created_by: adminUserId },
      { school_id: schoolId, exam_name: 'Unit Test 2', exam_type: 'Unit Test', start_date: '2026-05-10', end_date: '2026-05-13', class_id: grade1.id, created_by: adminUserId },
    ];

    const { data: createdExams, error: examErr } = await supabase.from('exams').insert(exams).select();
    if (examErr) console.error('❌ Exam error:', examErr.message);
    else console.log(`✅ Created ${createdExams.length} exams`);
  }

  // ============================================================
  // GRADES — separate from exams, uses exam_name not exam_id
  // ============================================================
  console.log('\n1️⃣2️⃣ Setting up grades...');
  const { data: existingGrades } = await supabase.from('grades').select('id').eq('class_id', grade1.id).limit(1);

  if (existingGrades && existingGrades.length > 0) {
    console.log('⚠️  Grades exist, skipping');
  } else if (studentIds.length > 0) {
    const subjectList = [mathSubject, engSubject, sciSubject, hindiSubject].filter(Boolean);
    const grades = [];

    for (const sid of studentIds) {
      for (const subj of subjectList) {
        const m1 = Math.floor(Math.random() * 25) + 65;
        grades.push({ class_id: grade1.id, student_id: sid, subject_id: subj.id, exam_name: 'Unit Test 1',
          marks_obtained: m1, total_marks: 100, grade: m1 >= 90 ? 'A+' : m1 >= 80 ? 'A' : m1 >= 70 ? 'B+' : 'B', term: 'Term 1', academic_year: '2025-2026' });
        const m2 = Math.floor(Math.random() * 25) + 65;
        grades.push({ class_id: grade1.id, student_id: sid, subject_id: subj.id, exam_name: 'Mid-Term Examination',
          marks_obtained: m2, total_marks: 100, grade: m2 >= 90 ? 'A+' : m2 >= 80 ? 'A' : m2 >= 70 ? 'B+' : 'B', term: 'Term 1', academic_year: '2025-2026' });
      }
    }

    const { error: gradeErr } = await supabase.from('grades').insert(grades);
    if (gradeErr) console.error('❌ Grades error:', gradeErr.message);
    else console.log(`✅ Created ${grades.length} grade entries for ${studentIds.length} students`);
  }

  // ============================================================
  // ANNOUNCEMENTS — message (not content), target_audience (not priority), no school_id
  // ============================================================
  console.log('\n1️⃣3️⃣ Setting up announcements...');
  const { data: existingAnn } = await supabase.from('announcements').select('id').limit(1);

  if (existingAnn && existingAnn.length > 0) {
    console.log('⚠️  Announcements exist, skipping');
  } else {
    const anns = [
      { title: 'Annual Sports Day Celebration', message: 'We are excited to announce our Annual Sports Day on May 15, 2026. All students are expected to participate. Parents are cordially invited.',
        created_by: adminUserId, target_audience: 'all', announcement_type: 'event' },
      { title: 'Parent-Teacher Meeting Schedule', message: 'The quarterly PTM is scheduled for April 28, 2026 from 10:00 AM to 1:00 PM. Please ensure your availability.',
        created_by: adminUserId, target_audience: 'parents', announcement_type: 'general' },
      { title: 'Summer Uniform Transition', message: 'Starting May 1, 2026, students should wear summer uniforms. Please ensure your child has the appropriate uniform ready.',
        created_by: adminUserId, target_audience: 'all', announcement_type: 'general' },
    ];

    const { error: annErr } = await supabase.from('announcements').insert(anns);
    if (annErr) console.error('❌ Announcements error:', annErr.message);
    else console.log(`✅ Created ${anns.length} announcements`);
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n==================================');
  console.log('🎉 DEMO SETUP COMPLETE!');
  console.log('==================================');
  console.log('\n📋 Demo Login Credentials:');
  console.log('----------------------------------');
  console.log('👨‍💼 ADMIN LOGIN:');
  console.log('   Email: littlestars@gmail.com');
  console.log('   Pass:  Ramrak16@!\n');

  // Teacher logins
  const { data: tProfiles } = await supabase.from('profiles').select('id, full_name, email').in('id', teacherUserIds);
  console.log('👩‍🏫 TEACHER LOGINS:');
  for (const p of (tProfiles || []).filter(p => !p.full_name?.includes('Demo')).slice(0, 6)) {
    console.log(`   ${p.full_name} — ${p.email}`);
  }
  console.log('   (Password for all: Teacher@123)\n');

  // Student logins
  const studentUserIds = allStudents?.map(s => s.user_id) || [];
  const { data: sProfiles } = await supabase.from('profiles').select('id, full_name, email').in('id', studentUserIds.length > 0 ? studentUserIds : ['none']);
  console.log('🎓 STUDENT LOGINS:');
  for (const p of (sProfiles || []).slice(0, 5)) {
    console.log(`   ${p.full_name} — ${p.email}`);
  }
  console.log('   (Password for all: Password@123)\n');

  // Data counts
  const { count: c1 } = await supabase.from('timetable').select('id', { count: 'exact', head: true }).eq('class_id', grade1.id);
  const { count: c2 } = await supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('class_id', grade1.id);
  const { count: c3 } = await supabase.from('homework').select('id', { count: 'exact', head: true }).eq('class_id', grade1.id);
  const { count: c4 } = await supabase.from('exams').select('id', { count: 'exact', head: true }).eq('school_id', schoolId);
  const { count: c5 } = await supabase.from('grades').select('id', { count: 'exact', head: true }).eq('school_id', schoolId);

  console.log('📚 Demo Data Summary:');
  console.log('----------------------------------');
  console.log(`   📅 Timetable entries:  ${c1 || 0}`);
  console.log(`   ✅ Attendance records: ${c2 || 0}`);
  console.log(`   📝 Homework assigned:  ${c3 || 0}`);
  console.log(`   📊 Exams created:      ${c4 || 0}`);
  console.log(`   🏅 Grade entries:      ${c5 || 0}`);
  console.log(`   👨‍🎓 Students enrolled:  ${studentIds.length}`);
  console.log(`\n🌐 Open: http://localhost:8080/auth`);
  console.log('==================================\n');

  await supabase.auth.signOut();
}

main().catch(console.error);
