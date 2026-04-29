// Chart component: stacked bar / bar / heatmap of weekly workload.
// Slots use absolute dateKey; chart filters by visible week (`dates` prop).

const { useState, useRef, useEffect } = React;

// Map proximity to today → background color
function urgencyBg(distance) {
  if (distance < 0) return 'transparent';
  const d = Math.min(distance, 7);
  const tt = d / 7;
  const hue = 25 + tt * 120;
  const chroma = 0.08 - tt * 0.04;
  const light = 0.93 + tt * 0.03;
  return `oklch(${light} ${chroma} ${hue})`;
}
function urgencyText(distance) {
  if (distance < 0) return 'var(--ink-3)';
  const d = Math.min(distance, 7);
  const tt = d / 7;
  const hue = 25 + tt * 120;
  const chroma = 0.13 - tt * 0.06;
  const light = 0.45 + tt * 0.10;
  return `oklch(${light} ${chroma} ${hue})`;
}

function WorkloadChart({
  tasks, subjects, capacity, dayLabels, dates,
  chartType, t, density, todayDate,
  onMoveSlot, onSelectTask, selectedTaskId,
}) {
  const [drag, setDrag] = useState(null);
  const [hoverDay, setHoverDay] = useState(null);
  const chartRef = useRef(null);

  const weekKeys = dates.map(dateKey);

  // Aggregate per-day stacks — only slots whose dateKey matches a day in this week
  const daySlots = Array.from({ length: 7 }, () => []);
  tasks.forEach((task) => {
    task.slots.forEach((slot, idx) => {
      const dayIdx = weekKeys.indexOf(slot.dateKey);
      if (dayIdx >= 0) {
        daySlots[dayIdx].push({ taskId: task.id, slotIdx: idx, hours: slot.hours, task, slot });
      }
    });
  });

  const dayTotals = daySlots.map((s) => s.reduce((a, b) => a + b.hours, 0));
  const maxHours = Math.max(capacity * 1.4, ...dayTotals, 8);
  const heaviestDay = dayTotals.indexOf(Math.max(...dayTotals));

  const chartH = density === 'compact' ? 240 : 300;
  const barW = density === 'compact' ? 38 : 46;
  const gap = density === 'compact' ? 14 : 22;
  const hToY = (h) => h / maxHours * chartH;

  const onSlotMouseDown = (e, taskId, slotIdx, fromDay) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setDrag({
      taskId, slotIdx, fromDay,
      x: e.clientX, y: e.clientY,
      ox: e.clientX - rect.left,
      oy: e.clientY - rect.top,
      w: rect.width, h: rect.height,
    });
  };

  useEffect(() => {
    if (!drag) return;
    const move = (ev) => {
      setDrag((d) => d && { ...d, x: ev.clientX, y: ev.clientY });
      if (chartRef.current) {
        const cols = chartRef.current.querySelectorAll('[data-day]');
        let found = null;
        cols.forEach((c) => {
          const r = c.getBoundingClientRect();
          if (ev.clientX >= r.left && ev.clientX <= r.right) {
            found = parseInt(c.dataset.day, 10);
          }
        });
        setHoverDay(found);
      }
    };
    const up = () => {
      setDrag((d) => {
        if (d && hoverDay != null && hoverDay !== d.fromDay) {
          // Move slot to the dateKey of the dropped column
          onMoveSlot(d.taskId, d.slotIdx, weekKeys[hoverDay]);
        }
        return null;
      });
      setHoverDay(null);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [drag, hoverDay, onMoveSlot, weekKeys]);

  const dayDistance = (idx) => {
    if (!todayDate) return -1;
    const ms = dates[idx].setHours(0, 0, 0, 0) - new Date(todayDate).setHours(0, 0, 0, 0);
    return Math.round(ms / 86400000);
  };

  if (chartType === 'heatmap') {
    return (
      <HeatmapView dayTotals={dayTotals}
        capacity={capacity} dayLabels={dayLabels} dates={dates} t={t}
        dayDistance={dayDistance} />
    );
  }

  return (
    <div className="chart-wrap" ref={chartRef}>
      <div className="chart-grid" style={{ height: chartH }}>
        {[0, 0.25, 0.5, 0.75, 1].map((p) => {
          const h = p * maxHours;
          return (
            <div key={p} className="grid-line" style={{ bottom: hToY(h) }}>
              <span className="grid-label">{h.toFixed(0)}h</span>
            </div>
          );
        })}
        <div className="capacity-line" style={{ bottom: hToY(capacity) }}>
          <span className="capacity-label">
            {t.capacity} · <span className="mono">{capacity}{t.hours}</span>{t.perDay}
          </span>
        </div>
      </div>

      <div className="chart-cols" style={{ height: chartH, gap }}>
        {Array.from({ length: 7 }).map((_, dayIdx) => {
          const slots = daySlots[dayIdx];
          const total = dayTotals[dayIdx];
          const over = total > capacity;
          const isHover = hoverDay === dayIdx && drag;
          const isHeaviest = dayIdx === heaviestDay && total > 0;

          return (
            <div key={dayIdx} className={`chart-col ${isHover ? 'drop-target' : ''}`}
                 data-day={dayIdx} style={{ width: barW }}>
              {total > 0 && (
                <div className="day-total mono" style={{ bottom: hToY(total) + 6 }}>
                  {total}{t.hours}
                </div>
              )}
              <div className="stack" style={{ height: chartH }}>
                {chartType === 'stacked' ? (
                  slots.map((s, i) => {
                    const subj = subjects.find((x) => x.id === s.task.subjectId);
                    const isDragging = drag && drag.taskId === s.taskId && drag.slotIdx === s.slotIdx && drag.fromDay === dayIdx;
                    const isSelected = selectedTaskId === s.taskId;
                    return (
                      <div
                        key={i}
                        className={`slot ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''}`}
                        style={{
                          height: hToY(s.hours),
                          background: subj?.color,
                          opacity: isDragging ? 0.25 : selectedTaskId && !isSelected ? 0.4 : 1,
                          display: 'flex', flexDirection: 'row',
                          alignItems: 'center', justifyContent: 'center',
                        }}
                        onMouseDown={(e) => onSlotMouseDown(e, s.taskId, s.slotIdx, dayIdx)}
                        onClick={() => onSelectTask(s.taskId)}
                        title={`${s.task.title} · ${s.slot.startHour != null ? fmtTime(s.slot.startHour) + ' · ' : ''}${s.hours}${t.hours}`}>
                        {s.hours >= 1.5 && (
                          <span className="slot-label">
                            {subj?.short}<span className="mono"> · {s.hours}h</span>
                          </span>
                        )}
                        {s.hours < 1.5 && (
                          <span className="slot-label slot-label-tiny mono">{subj?.short} {s.hours}h</span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  total > 0 && (
                    <div className="slot bar-mode" style={{
                      height: hToY(total),
                      background: over ? 'oklch(0.72 0.12 25)' : 'oklch(0.74 0.06 80)',
                    }} />
                  )
                )}
              </div>
              {(() => {
                const dist = dayDistance(dayIdx);
                const bg = urgencyBg(dist);
                const fg = urgencyText(dist);
                const isToday = dist === 0;
                return (
                  <div className={`day-label ${isHeaviest ? 'heaviest' : ''} ${over ? 'over' : ''} ${isToday ? 'is-today' : ''}`}
                       style={{ background: bg, color: fg }}>
                    <div className="dlabel" style={{ color: fg }}>{dayLabels[dayIdx]}</div>
                    <div className="ddate mono" style={{ color: fg, opacity: 0.78 }}>{dates[dayIdx].getDate()}</div>
                    {isToday && <div className="today-pip" />}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {drag && (() => {
        const task = tasks.find((x) => x.id === drag.taskId);
        const slot = task?.slots[drag.slotIdx];
        const subj = subjects.find((s) => s.id === task?.subjectId);
        if (!slot) return null;
        return (
          <div className="drag-ghost" style={{
            left: drag.x - drag.ox, top: drag.y - drag.oy,
            width: drag.w, height: drag.h,
            background: subj?.color,
          }}>
            <span className="slot-label">{subj?.short}<span className="mono"> · {slot.hours}h</span></span>
          </div>
        );
      })()}
    </div>
  );
}

function HeatmapView({ dayTotals, capacity, dayLabels, dates, t, dayDistance }) {
  const max = Math.max(capacity * 1.2, ...dayTotals, 1);
  return (
    <div className="heatmap">
      <div className="hm-row">
        {Array.from({ length: 7 }).map((_, i) => {
          const total = dayTotals[i];
          const intensity = total / max;
          const over = total > capacity;
          const bg = over
            ? `oklch(${0.95 - intensity * 0.2} ${0.05 + intensity * 0.1} 25)`
            : `oklch(${0.96 - intensity * 0.25} ${0.02 + intensity * 0.05} ${145 - intensity * 70})`;
          const dist = dayDistance ? dayDistance(i) : -1;
          const isToday = dist === 0;
          return (
            <div key={i} className={`hm-cell ${over ? 'over' : ''} ${isToday ? 'is-today' : ''}`} style={{ background: bg }}>
              <div className="hm-day-row">
                <span className="hm-urg-pip" style={{ background: urgencyText(dist) }} />
                <div className="hm-day">{dayLabels[i]}</div>
              </div>
              <div className="hm-date mono">{dates[i].getDate()}</div>
              <div className="hm-hours mono">{total}<span className="hm-unit">{t.hours}</span></div>
            </div>
          );
        })}
      </div>
      <div className="hm-legend">
        <span>0{t.hours}</span>
        <div className="hm-bar" />
        <span>{capacity}{t.hours} ({t.capacity})</span>
        <div className="hm-bar over" />
        <span>{(capacity * 1.5).toFixed(0)}{t.hours}+</span>
      </div>
    </div>
  );
}

window.WorkloadChart = WorkloadChart;
