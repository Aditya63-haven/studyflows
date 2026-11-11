interface DayTabsProps {
  days: Array<{ label: string; minutes: string }>;
  selected: number;
  onSelect: (index: number) => void;
}

export const DayTabs = ({ days, selected, onSelect }: DayTabsProps) => (
  <div className="day-tabs" role="tablist" aria-label="Days of the week">
    {days.map((day, index) => (
      <button
        key={day.label}
        type="button"
        role="tab"
        aria-selected={index === selected}
        className={index === selected ? 'day-tab selected' : 'day-tab'}
        onClick={() => onSelect(index)}
      >
        <span>{day.label}</span>
        <span className="day-tab-minutes">{day.minutes}</span>
      </button>
    ))}
  </div>
);
