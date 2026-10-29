// Local calendar-date helpers. Avoid toISOString() for date-only values because it converts to UTC.
export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(dateKey) {
  if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return new Date(NaN);
  }
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getShortDay(date = new Date()) {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

export function getNextDateForShortDay(shortDay, from = new Date()) {
  const dayNumbers = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const targetDay = dayNumbers[shortDay];
  if (targetDay === undefined) return getLocalDateKey(from);
  const result = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const daysAhead = (targetDay - result.getDay() + 7) % 7;
  result.setDate(result.getDate() + daysAhead);
  return getLocalDateKey(result);
}


// Validate persisted timetable data and migrate legacy one-off tasks that lack a
// date. Without this migration, old one-off tasks could appear on every date.
export function normalizeTimetable(value, from = new Date()) {
  const validDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { timetable: {}, changed: value != null };
  }

  const timetable = {};
  let changed = false;
  for (const day of validDays) {
    const rawTasks = value[day];
    if (!Array.isArray(rawTasks)) {
      timetable[day] = [];
      if (rawTasks !== undefined) changed = true;
      continue;
    }

    timetable[day] = rawTasks
      .filter((task) => {
        const valid = task && typeof task === 'object' && task.id != null && (typeof task.id === 'string' || typeof task.id === 'number');
        if (!valid) changed = true;
        return valid;
      })
      .map((task) => {
        const repeatDays = Array.isArray(task.repeatDays) ? task.repeatDays : [];
        const normalizedTask = typeof task.id === 'number' ? { ...task, id: String(task.id) } : task;
        if (typeof task.id === 'number') changed = true;
        if (repeatDays.length === 0 && !task.scheduledDate) {
          changed = true;
          return { ...normalizedTask, scheduledDate: getNextDateForShortDay(day, from) };
        }
        return normalizedTask;
      });
  }

  if (Object.keys(value).some((day) => !validDays.includes(day))) changed = true;
  return { timetable, changed };
}
