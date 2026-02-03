"use client";

import { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import { SUBJECTS, Subject, DEFAULT_SCHEDULE } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import SubjectCard from '@/components/SubjectCard';
import ScheduleBuilder from '@/components/ScheduleBuilder';
import CalendarView from '@/components/CalendarView';

export default function Home() {
  const [username, setUsername] = useState<string | null>(null);
  const [inputName, setInputName] = useState('');

  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'calendar'>('dashboard');

  const [skips, setSkips] = useState<Record<string, number>>({});
  const [manualCanceled, setManualCanceled] = useState<Record<string, number>>({});

  const [weeklySchedule, setWeeklySchedule] = useState<Record<number, string[]>>(DEFAULT_SCHEDULE);
  const [calendarExceptions, setCalendarExceptions] = useState<string[]>([]);
  const [calendarSkips, setCalendarSkips] = useState<string[]>([]);

  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize
  useEffect(() => {
    // Check for logged in user
    const savedUser = localStorage.getItem('absence_user');
    if (savedUser) {
      setUsername(savedUser);
      loadData(savedUser);
    }
    setMounted(true);
  }, []);

  const loadData = async (user: string) => {
    setIsLoading(true);
    try {
      // 1. Fetch Global Settings (Default Schedule)
      const { data: globalData } = await supabase
        .from('global_settings')
        .select('setting_value')
        .eq('setting_key', 'default_schedule')
        .single();

      const globalDefaultSchedule = globalData?.setting_value || DEFAULT_SCHEDULE;

      // 2. Fetch User Data
      const { data, error } = await supabase
        .from('user_data')
        .select('*')
        .eq('username', user)
        .single();

      if (data) {
        // User exists, load their data
        setSkips(data.skips || {});
        setManualCanceled(data.manual_canceled || {});
        // Use user's schedule if they have one, otherwise fallback to global default
        setWeeklySchedule(data.weekly_schedule || globalDefaultSchedule);
        setCalendarExceptions(data.calendar_exceptions || []);
        setCalendarSkips(data.calendar_skips || []);
      } else {
        // User doesn't exist, create them
        const initialSkips: Record<string, number> = {};
        const initialCanceled: Record<string, number> = {};
        SUBJECTS.forEach(s => {
          initialSkips[s.id] = 0;
          initialCanceled[s.id] = 0;
        });

        // Use global default schedule for new user
        setWeeklySchedule(globalDefaultSchedule);
        setSkips(initialSkips);
        setManualCanceled(initialCanceled);

        // Save initial row
        await supabase.from('user_data').insert({
          username: user,
          skips: initialSkips,
          manual_canceled: initialCanceled,
          weekly_schedule: globalDefaultSchedule, // Explicitly save the default so they have a copy
          calendar_exceptions: [],
          calendar_skips: []
        });
      }
    } catch (e) {
      console.error("Error loading data:", e);
      // Fallback to local storage or defaults if offline?
      // For now we persist with error but maybe show toast
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced Save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (mounted && username && !isLoading) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await supabase.from('user_data').upsert({
            username: username,
            skips: skips,
            manual_canceled: manualCanceled,
            weekly_schedule: weeklySchedule,
            calendar_exceptions: calendarExceptions,
            calendar_skips: calendarSkips,
            updated_at: new Date().toISOString()
          });
        } catch (e) {
          console.error("Error saving data:", e);
        }
      }, 1000); // Save after 1 second of no changes
    }
  }, [skips, manualCanceled, weeklySchedule, calendarExceptions, calendarSkips, mounted, username, isLoading]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim()) return;
    const name = inputName.trim();
    localStorage.setItem('absence_user', name);
    setUsername(name);
    loadData(name);
  };

  const handleLogout = () => {
    localStorage.removeItem('absence_user');
    setUsername(null);
    setInputName('');
  };

  const updateSkip = (id: string, delta: number) => {
    setSkips(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

  const updateManualCanceled = (id: string, delta: number) => {
    setManualCanceled(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

  // Calculate Calendar Cancellations
  const getCalendarCanceledCounts = () => {
    const counts: Record<string, number> = {};
    SUBJECTS.forEach(s => counts[s.id] = 0);

    calendarExceptions.forEach(dateStr => {
      const date = new Date(dateStr);
      // getDay: 0=Sun, 1=Mon... Matches our schedule keys if mapped
      const dayIndex = date.getDay();
      // Our schedule uses 1=Mon...
      const subjectsOnDay = weeklySchedule[dayIndex] || [];

      subjectsOnDay.forEach(subId => {
        if (counts[subId] !== undefined) counts[subId]++;
      });
    });

    return counts;
  };

  const calendarCanceled = getCalendarCanceledCounts();

  // Calculate Calendar Skips (Added to User Skips)
  const getCalendarSkipCounts = () => {
    const counts: Record<string, number> = {};
    SUBJECTS.forEach(s => counts[s.id] = 0);

    calendarSkips.forEach(dateStr => {
      const date = new Date(dateStr);
      const dayIndex = date.getDay();
      const subjectsOnDay = weeklySchedule[dayIndex] || [];
      subjectsOnDay.forEach(subId => {
        if (counts[subId] !== undefined) counts[subId]++;
      });
    });
    return counts;
  };

  const calendarSkipCounts = getCalendarSkipCounts();

  if (!mounted) return null;

  // Login Screen
  if (!username) {
    return (
      <main className="container" style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
        <div className="glass-panel" style={{ padding: '3rem', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Welcome</h1>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Enter your name..."
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              className="input-field"
              style={{ marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.2rem' }}
              autoFocus
            />
            <button type="submit" className="btn" style={{ width: '100%', fontSize: '1.1rem' }}>
              Enter App
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingBottom: '100px', maxWidth: '800px' }}>
      <header style={{ marginBottom: '2rem', textAlign: 'center', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Absence Calc</h1>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#aaa',
              cursor: 'pointer',
              fontSize: '0.8rem',
              padding: '0.4rem 0.8rem',
              borderRadius: '20px'
            }}
          >
            Logout
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          background: 'rgba(0,0,0,0.3)',
          padding: '0.3rem',
          borderRadius: '12px',
          gap: '0.5rem'
        }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'schedule', label: 'Schedule', icon: '📝' },
            { id: 'calendar', label: 'Calendar', icon: '📅' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                flex: 1,
                background: activeTab === tab.id ? 'var(--card-bg)' : 'transparent',
                border: activeTab === tab.id ? '1px solid var(--card-border)' : 'none',
                color: activeTab === tab.id ? '#fff' : '#888',
                padding: '0.8rem',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: activeTab === tab.id ? 600 : 400
              }}
            >
              <span style={{ marginRight: '6px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* DASHBOARD */}
      {activeTab === 'dashboard' && (
        <>
          <div className="grid-layout">
            {SUBJECTS.map((subject) => {
              const autoCanceled = calendarCanceled[subject.id] || 0;
              const manual = manualCanceled[subject.id] || 0;
              const totalCanceled = manual + autoCanceled;

              const autoSkip = calendarSkipCounts[subject.id] || 0;
              const manualSkip = skips[subject.id] || 0;
              const totalSkips = manualSkip + autoSkip;

              return (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  userSkips={totalSkips}
                  schoolCanceled={totalCanceled}
                  onAdd={() => updateSkip(subject.id, 1)}
                  onRemove={() => updateSkip(subject.id, -1)}
                  onAddCanceled={() => updateManualCanceled(subject.id, 1)}
                  onRemoveCanceled={() => updateManualCanceled(subject.id, -1)}
                />
              );
            })}
          </div>
        </>
      )}

      {/* SCHEDULE */}
      {activeTab === 'schedule' && (
        <ScheduleBuilder
          schedule={weeklySchedule}
          onChange={setWeeklySchedule}
        />
      )}

      {/* CALENDAR */}
      {activeTab === 'calendar' && (
        <CalendarView
          schedule={weeklySchedule}
          exceptions={calendarExceptions}
          skips={calendarSkips}
          onToggleException={(date) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            // If marking as Exception (School Canceled), remove from Skips if present
            if (calendarSkips.includes(dateStr)) {
              setCalendarSkips(prev => prev.filter(d => d !== dateStr));
            }

            if (calendarExceptions.includes(dateStr)) {
              setCalendarExceptions(prev => prev.filter(d => d !== dateStr));
            } else {
              setCalendarExceptions(prev => [...prev, dateStr]);
            }
          }}
          onToggleSkip={(date) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            // If marking as Skip, remove from Exceptions if present
            if (calendarExceptions.includes(dateStr)) {
              setCalendarExceptions(prev => prev.filter(d => d !== dateStr));
            }

            if (calendarSkips.includes(dateStr)) {
              setCalendarSkips(prev => prev.filter(d => d !== dateStr));
            } else {
              setCalendarSkips(prev => [...prev, dateStr]);
            }
          }}
        />
      )}

      <footer style={{ marginTop: '4rem', textAlign: 'center', color: '#555' }}>
        <p>Stay safe, {username}. Don't fail.</p>
      </footer>
    </main>
  );
}
