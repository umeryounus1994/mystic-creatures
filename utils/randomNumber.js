// eslint-disable-next-line func-names
exports.randomNumber = function (length) {
  let text = "";
  const possible = "123456789";
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < length; i++) {
    const sup = Math.floor(Math.random() * possible.length);
    // eslint-disable-next-line eqeqeq
    text += i > 0 && sup == i ? "0" : possible.charAt(sup);
  }
  return Number(text);
};

// eslint-disable-next-line func-names
exports.getWeekNumber = function (date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNumber;
};
