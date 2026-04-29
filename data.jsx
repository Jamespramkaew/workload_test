// Sample data + helpers for Workload Prioritizer
// Slots use absolute dates (dateKey: "YYYY-MM-DD") instead of day-of-week index.

const SUBJECTS = [
  { id: 'aws',   name: 'AWS Cloud',     short: 'AWS', color: 'oklch(0.72 0.09 250)' },
  { id: 'os',    name: 'Operating Sys', short: 'OS',  color: 'oklch(0.74 0.08 145)' },
  { id: 'algo',  name: 'Algorithms',    short: 'ALG', color: 'oklch(0.78 0.10 75)'  },
  { id: 'hack',  name: 'Hackathon',     short: 'HCK', color: 'oklch(0.72 0.09 25)'  },
  { id: 'db',    name: 'Database',      short: 'DB',  color: 'oklch(0.73 0.08 305)' },
  { id: 'web',   name: 'Web Dev',       short: 'WEB', color: 'oklch(0.74 0.07 195)' },
  { id: 'math',  name: 'Calculus',      short: 'MTH', color: 'oklch(0.74 0.06 50)'  },
];

function estimateHours({ difficulty, importance, comfortable }) {
  let h = 1 + (difficulty - 1) * 0.9;
  h += (importance - 3) * 0.4;
  if (!comfortable) h *= 1.3;
  return Math.max(1, Math.round(h * 2) / 2);
}

function splitHours(total, days) {
  if (days <= 0) return [];
  const slices = Math.round(total * 2);
  const base = Math.floor(slices / days);
  const rem = slices - base * days;
  const out = Array(days).fill(base / 2);
  for (let i = 0; i < rem; i++) out[i] += 0.5;
  return out;
}

function daysToSplit(hours) {
  if (hours <= 2) return 1;
  if (hours <= 4) return 2;
  if (hours <= 6) return 3;
  if (hours <= 9) return 4;
  return 5;
}

// "Today" for the prototype — Monday Apr 27 2026
const PROTO_TODAY = new Date(2026, 3, 27);

// Build week dates starting Monday from offset
function weekDates(weekOffset = 0) {
  const today = new Date(PROTO_TODAY);
  const dow = today.getDay();
  const monday = new Date(today);
  const diff = (dow === 0 ? -6 : 1 - dow);
  monday.setDate(today.getDate() + diff + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

// ISO key "YYYY-MM-DD" (local, no TZ shift)
function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function keyToDate(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}
// add N days to a key
function addDays(k, n) {
  const d = keyToDate(k);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

const DAY_LABELS_EN = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAY_LABELS_TH = ['จ.','อ.','พ.','พฤ.','ศ.','ส.','อา.'];

function makeInitialTasks() {
  // Anchor on PROTO_TODAY (Monday Apr 27 2026). Use absolute dateKey on each slot.
  const wk0 = weekDates(0).map(dateKey);   // Apr 27..May 3
  const wk1 = weekDates(1).map(dateKey);   // May 4..10
  return [
    {
      id: 't1', title: 'AWS Lambda assignment', subjectId: 'aws',
      deadlineKey: wk0[4], difficulty: 4, importance: 5, comfortable: false, hours: 4,
      slots: [
        { dateKey: wk0[1], startHour: 19, hours: 2 },
        { dateKey: wk0[3], startHour: 20, hours: 2 },
      ],
    },
    {
      id: 't2', title: 'OS scheduler project', subjectId: 'os',
      deadlineKey: wk0[5], difficulty: 5, importance: 4, comfortable: false, hours: 5,
      slots: [
        { dateKey: wk0[0], startHour: 18, hours: 2 },
        { dateKey: wk0[2], startHour: 19, hours: 1.5 },
        { dateKey: wk0[4], startHour: 14, hours: 1.5 },
      ],
    },
    {
      id: 't3', title: 'Algorithms — DP problems', subjectId: 'algo',
      deadlineKey: wk0[3], difficulty: 3, importance: 4, comfortable: true, hours: 3,
      slots: [
        { dateKey: wk0[1], startHour: 16, hours: 1.5 },
        { dateKey: wk0[2], startHour: 16, hours: 1.5 },
      ],
    },
    {
      id: 't4', title: 'Hackathon prep', subjectId: 'hack',
      deadlineKey: wk1[2], difficulty: 3, importance: 5, comfortable: true, hours: 6,
      slots: [
        { dateKey: wk0[5], startHour: 10, hours: 2 },
        { dateKey: wk0[6], startHour: 13, hours: 2 },
        { dateKey: wk1[1], startHour: 18, hours: 2 },
      ],
    },
    {
      id: 't5', title: 'Calculus exercises', subjectId: 'math',
      deadlineKey: wk0[4], difficulty: 2, importance: 3, comfortable: true, hours: 2,
      slots: [
        { dateKey: wk0[3], startHour: 21, hours: 2 },
      ],
    },
  ];
}

function fmtTime(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
function fmtTimeRange(start, dur) {
  const end = start + dur;
  return `${fmtTime(start)}–${fmtTime(end)}`;
}

const STRINGS = {
  en: {
    appName: 'Workload Prioritizer', tagline: 'See your week before it sees you.',
    week: 'Week', today: 'Today', addTask: 'Add task', addNewTask: 'Add a new task',
    title: 'Title', subject: 'Subject', deadline: 'Deadline',
    difficulty: 'Difficulty', importance: 'Importance', comfortable: 'Comfortable with this?',
    yes: 'Yes', no: 'No', estimated: 'Estimated time', autoCalc: 'auto',
    save: 'Save', cancel: 'Cancel', hours: 'h', hoursFull: 'hours',
    dayLabels: DAY_LABELS_EN, capacity: 'Capacity', perDay: '/day',
    overload: 'Over capacity', overloadHint: 'Move a task to another day to bring this under your limit.',
    totalThisWeek: 'Total this week', tasksThisWeek: 'Tasks this week', overdays: 'Days over limit',
    yourTasks: 'Your tasks', empty: 'No tasks yet — add one to start visualizing your week.',
    dueIn: 'due', deleteTask: 'Delete', splitAcross: 'split across', days: 'days',
    timeOfDay: 'Time of day', startTime: 'Start', duration: 'Duration',
    sessions: 'Sessions', addSession: '+ Add session', removeSession: 'Remove',
    sessionN: 'Session', autoSchedule: 'Auto-schedule', customSchedule: 'Custom schedule',
    chartType: 'Chart', stacked: 'Stacked', bar: 'Bar', heatmap: 'Heatmap',
    settings: 'Settings', onboardingTitle: 'Welcome',
    onboardingDesc: 'Tell us how much you can take on each day. We\'ll warn you when a week gets scary.',
    capacityQ: 'How many hours per day can you handle?', start: 'Start planning',
    legend: 'Subjects', weekHigh: 'Heaviest day', none: '—',
    date: 'Date', otherWeek: 'other week',
  },
  th: {
    appName: 'Workload Prioritizer', tagline: 'เห็นสัปดาห์ก่อนที่มันจะถล่มคุณ',
    week: 'สัปดาห์', today: 'วันนี้', addTask: 'เพิ่มงาน', addNewTask: 'เพิ่มงานใหม่',
    title: 'ชื่องาน', subject: 'วิชา', deadline: 'เดดไลน์',
    difficulty: 'ความยาก', importance: 'ความสำคัญ', comfortable: 'ถนัดเรื่องนี้ไหม?',
    yes: 'ถนัด', no: 'ไม่ถนัด', estimated: 'เวลาประมาณ', autoCalc: 'อัตโนมัติ',
    save: 'บันทึก', cancel: 'ยกเลิก', hours: 'ชม.', hoursFull: 'ชั่วโมง',
    dayLabels: DAY_LABELS_TH, capacity: 'รับไหว', perDay: '/วัน',
    overload: 'เกินที่รับไหว', overloadHint: 'ลองย้ายงานไปวันอื่นเพื่อให้อยู่ในขีดจำกัด',
    totalThisWeek: 'รวมสัปดาห์นี้', tasksThisWeek: 'งานสัปดาห์นี้', overdays: 'วันที่เกินลิมิต',
    yourTasks: 'รายการงาน', empty: 'ยังไม่มีงาน — เพิ่มงานเพื่อเริ่มดูภาพสัปดาห์',
    dueIn: 'ส่ง', deleteTask: 'ลบ', splitAcross: 'แบ่งเป็น', days: 'วัน',
    timeOfDay: 'ช่วงเวลา', startTime: 'เริ่ม', duration: 'ระยะเวลา',
    sessions: 'ช่วงทำงาน', addSession: '+ เพิ่มช่วง', removeSession: 'ลบ',
    sessionN: 'ช่วงที่', autoSchedule: 'จัดเวลาอัตโนมัติ', customSchedule: 'กำหนดเวลาเอง',
    chartType: 'แผนภูมิ', stacked: 'ซ้อนสี', bar: 'แท่ง', heatmap: 'ฮีตแมป',
    settings: 'ตั้งค่า', onboardingTitle: 'ยินดีต้อนรับ',
    onboardingDesc: 'บอกเราว่ารับงานได้กี่ชั่วโมงต่อวัน เราจะเตือนเมื่อสัปดาห์เริ่มน่ากลัว',
    capacityQ: 'รับงานได้กี่ชั่วโมง/วัน?', start: 'เริ่มวางแผน',
    legend: 'วิชา', weekHigh: 'วันที่หนักสุด', none: '—',
    date: 'วันที่', otherWeek: 'สัปดาห์อื่น',
  },
};

Object.assign(window, {
  SUBJECTS, estimateHours, splitHours, daysToSplit,
  weekDates, makeInitialTasks, STRINGS, fmtTime, fmtTimeRange,
  dateKey, keyToDate, addDays, PROTO_TODAY,
});
