/**
 * AttendX – Global Type Declarations
 * Suppresses VS Code "cannot find name" errors for cross-file globals.
 */

declare const AttendX: {
  auth: {
    login(username: string, password: string): Promise<any>;
    logout(): void;
    getSession(): { userId: string; name: string; dept: string; role: string; initials: string; loginAt: number } | null;
    isLoggedIn(): boolean;
  };
  students: {
    getList(year: string, section: string): Promise<{ id: string; rollNo: string; name: string }[]>;
    addStudent(year: string, section: string, student: { rollNo: string; name: string }): Promise<any>;
    removeStudent(year: string, section: string, rollNo: string): Promise<boolean>;
  };
  timetable: {
    get(facultyId: string): Promise<Record<string, any>>;
    save(facultyId: string, data: any): Promise<boolean>;
    getToday(facultyId: string): Promise<{ day: string; schedule: Record<string, any> }>;
  };
  attendance: {
    save(date: string, year: string, section: string, subject: string, records: any[], extraClassId?: string | null): Promise<string | null>;
    get(date: string, year: string, section: string, subject: string): Promise<any | null>;
    getByDate(date: string): Promise<any[]>;
    getDates(): Promise<string[]>;
    getStudentSummary(rollNo: string, year: string, section: string): Promise<Record<string, { total: number; present: number }>>;
    getAll(): Promise<any[]>;
  };
  extraClasses: {
    getAll(facultyId: string): Promise<any[]>;
    getToday(facultyId: string): Promise<any[]>;
    getUpcoming(facultyId: string): Promise<any[]>;
    schedule(d: any): Promise<any>;
    updateStatus(id: string, status: string): Promise<boolean>;
  };
  reports: {
    getClassReport(year: string, section: string, startDate?: string | null, endDate?: string | null, subject?: string | null): Promise<any[]>;
    getStudentReport(year: string, section: string, startDate?: string | null, endDate?: string | null): Promise<any[]>;
    exportCSV(data: any[], filename: string): void;
  };
  realtime: {
    start(): void;
    isLive(): boolean;
    onRefresh(key: string, fn: (ev: any) => void): void;
    offRefresh(key: string): void;
  };
  theme: {
    get(): string;
    toggle(): string;
    apply(): void;
  };
  toast: {
    show(msg: string, type?: string, duration?: number): void;
  };
  utils: {
    today(): string;
    formatDate(dateStr: string): string;
    pct(n: number, total: number): number;
    YEARS: string[];
    SECTIONS: string[];
    HOURS: string[];
    DAYS: string[];
    SUBJECTS_BY_YEAR: Record<string, string[]>;
  };
  connection: {
    state(): string;
    isConnected(): boolean;
    onChange(fn: (state: string) => void): void;
  };
  init(): Promise<void>;
};

declare const Utils: {
  toast: {
    show(msg: string, type?: string, duration?: number): void;
    success(msg: string, duration?: number): void;
    error(msg: string, duration?: number): void;
    warning(msg: string, duration?: number): void;
    info(msg: string, duration?: number): void;
  };
  modal: {
    open(id: string): void;
    close(id: string): void;
    closeAll(): void;
  };
  theme: {
    get(): string;
    set(t: string): void;
    toggle(): string;
    apply(): void;
  };
  date: {
    today(): string;
    format(d: string, opts?: object): string;
    formatTime(t: string): string;
    greeting(): string;
    dayName(): string;
    fullDate(): string;
    pct(n: number, t: number): number;
  };
  csv: {
    download(rows: any[], filename?: string): void;
  };
  whatsapp: {
    build(data: { subject: string; classLabel: string; dateStr: string; absentees: any[] }): string;
    share(text: string): void;
    copy(text: string): void;
  };
  loading: {
    show(el: HTMLElement, text?: string): void;
    hide(el: HTMLElement): void;
    spinner(text?: string): string;
    empty(icon: string, title: string, sub?: string): string;
  };
  hl(text: string, q: string): string;
  debounce(fn: Function, ms?: number): Function;
  $(sel: string, ctx?: Element): Element | null;
  $$(sel: string, ctx?: Element): Element[];
  el(tag: string, cls?: string, html?: string): HTMLElement;
  avatarColor(name: string): string;
  pctBadge(pct: number): string;
  progressBar(pct: number, color?: string): string;
  roleBadge(role: string): string;
};

declare const Nav: {
  go(page: string, params?: Record<string, any>): Promise<void>;
  getCurrent(): string;
  _params: Record<string, any>;
};

declare const SUPABASE_URL: string;
declare const SUPABASE_ANON_KEY: string;
declare const APP_CONFIG: {
  name: string;
  version: string;
  minAttendance: number;
  warnThreshold: number;
  draftTimeout: number;
};
