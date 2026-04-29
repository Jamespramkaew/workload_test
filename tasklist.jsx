// Task list + summary stats + overload warnings
// Slots/deadlines use absolute dateKey ("YYYY-MM-DD") instead of day-of-week index.

const { useState: useStateTL } = React;

function TaskList({ tasks, subjects, dayLabels, dates, capacity, t,
                    onDeleteTask, onSelectTask, selectedTaskId, onUpdateTask }) {
  if (tasks.length === 0) {
    return <div className="task-empty">{t.empty}</div>;
  }

  const weekKeys = dates.map(dateKey);

  // Format a deadlineKey as a short label.  If the date is in the visible week,
  // use the localized weekday + day-of-month; otherwise fall back to month/day.
  const fmtDeadline = (key) => {
    if (!key) return '—';
    const idx = weekKeys.indexOf(key);
    if (idx >= 0) return `${dayLabels[idx]} ${dates[idx].getDate()}`;
    const d = keyToDate(key);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  const fmtSlot = (key) => {
    if (!key) return '—';
    const idx = weekKeys.indexOf(key);
    if (idx >= 0) return dayLabels[idx];
    const d = keyToDate(key);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const updateSlot = (task, slotIdx, patch) => {
    const slots = task.slots.map((s, i) => i === slotIdx ? { ...s, ...patch } : s);
    const totalHours = slots.reduce((a, s) => a + s.hours, 0);
    onUpdateTask({ ...task, slots, hours: totalHours });
  };
  const addSlot = (task) => {
    const slots = [...task.slots, { dateKey: task.deadlineKey || weekKeys[0], startHour: 19, hours: 1 }];
    const totalHours = slots.reduce((a, s) => a + s.hours, 0);
    onUpdateTask({ ...task, slots, hours: totalHours });
  };
  const removeSlot = (task, slotIdx) => {
    if (task.slots.length <= 1) return;
    const slots = task.slots.filter((_, i) => i !== slotIdx);
    const totalHours = slots.reduce((a, s) => a + s.hours, 0);
    onUpdateTask({ ...task, slots, hours: totalHours });
  };
  const updateTitle = (task, title) => onUpdateTask({ ...task, title });

  return (
    <div className="task-list">
      {tasks.map((task) => {
        const subj = subjects.find((s) => s.id === task.subjectId);
        const isSelected = selectedTaskId === task.id;
        return (
          <div
            key={task.id}
            className={`task-card ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelectTask(task.id)}
          >
            <div className="task-bar" style={{ background: subj?.color }} />
            <div className="task-body">
              <div className="task-row1">
                <span className="task-subj mono">{subj?.short}</span>
                {isSelected ? (
                  <input
                    className="task-title-edit"
                    value={task.title}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateTitle(task, e.target.value)}
                  />
                ) : (
                  <span className="task-title">{task.title}</span>
                )}
              </div>
              <div className="task-row2">
                <span className="task-meta">
                  <span className="mono">{task.hours}{t.hours}</span> · <span className="mono">{task.slots.length}</span> {t.sessions || t.days}
                </span>
                <span className="task-due">
                  {t.dueIn} <span className="mono">{fmtDeadline(task.deadlineKey)}</span>
                </span>
              </div>

              {!isSelected && (
                <div className="task-slots">
                  {task.slots.map((slot, i) => (
                    <span key={i} className="task-slot mono">
                      {fmtSlot(slot.dateKey)}
                      {slot.startHour != null && <span className="task-slot-time"> {fmtTime(slot.startHour)}</span>}
                      <span className="task-slot-h"> · {slot.hours}h</span>
                    </span>
                  ))}
                </div>
              )}

              {isSelected && (
                <div className="task-edit" onClick={(e) => e.stopPropagation()}>
                  <div className="te-title">{t.sessions || 'Sessions'}</div>
                  <div className="te-list">
                    {task.slots.map((slot, i) => {
                      const dayTotal = task.slots
                        .filter((s) => s.dateKey === slot.dateKey)
                        .reduce((a, s) => a + s.hours, 0);
                      const over = dayTotal > capacity;
                      return (
                        <div key={i} className={`te-row ${over ? 'over' : ''}`}>
                          <div className="te-num mono">{i + 1}</div>
                          <input
                            type="date"
                            className="te-day"
                            value={slot.dateKey || ''}
                            onChange={(e) => updateSlot(task, i, { dateKey: e.target.value })}
                          />
                          <input
                            type="time"
                            className="te-time"
                            value={fmtTime(slot.startHour ?? 19)}
                            onChange={(e) => {
                              const [h, m] = e.target.value.split(':').map(Number);
                              updateSlot(task, i, { startHour: h + (m || 0) / 60 });
                            }}
                          />
                          <div className="te-dur-wrap">
                            <input
                              type="number"
                              className="te-dur"
                              min="0.5" max="12" step="0.5"
                              value={slot.hours}
                              onChange={(e) => updateSlot(task, i, { hours: Number(e.target.value) || 0.5 })}
                            />
                            <span className="te-unit mono">{t.hours}</span>
                          </div>
                          {task.slots.length > 1 ? (
                            <button
                              type="button"
                              className="te-x"
                              onClick={() => removeSlot(task, i)}
                              aria-label={t.removeSession}
                            >✕</button>
                          ) : <span></span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="te-foot">
                    <button type="button" className="te-add"
                            onClick={() => addSlot(task)}>{t.addSession}</button>
                    <span className="te-total">
                      {t.estimated}: <span className="mono">{task.hours}{t.hours}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
            <button
              className="task-del"
              onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
              aria-label={t.deleteTask}
            >✕</button>
          </div>
        );
      })}
    </div>
  );
}

function StatTile({ label, value, unit, tone }) {
  return (
    <div className={`stat ${tone || ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value mono">
        {value}
        {unit && <span className="stat-unit"> {unit}</span>}
      </div>
    </div>
  );
}

function OverloadBanner({ overDays, dayLabels, dates, t }) {
  if (overDays.length === 0) return null;
  return (
    <div className="overload-banner" role="alert">
      <span className="overload-dot" />
      <div className="overload-text">
        <strong>{t.overload}</strong> · <span className="overload-days">
          {overDays.map((d, i) => (
            <span key={d}>
              {dayLabels[d]} {dates[d].getDate()}{i < overDays.length - 1 ? ', ' : ''}
            </span>
          ))}
        </span>
        <div className="overload-hint">{t.overloadHint}</div>
      </div>
    </div>
  );
}

window.TaskList = TaskList;
window.StatTile = StatTile;
window.OverloadBanner = OverloadBanner;
