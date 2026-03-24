export const addDays = (dateStr, days) => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
};

export const isDateInRange = (target, start, end) =>
  target >= start && target <= end;