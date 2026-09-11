// Shared age helpers — age source of truth is date_of_birth
const AVG_DAYS_PER_MONTH = 30.44;

/** Live age in months from a date of birth */
function monthsFromDob(dob) {
  const diffMs = Date.now() - new Date(dob).getTime();
  if (diffMs <= 0) return 0;
  return diffMs / (1000 * 60 * 60 * 24 * AVG_DAYS_PER_MONTH);
}

/** Live age in years (float) — falls back to the stored snapshot */
function liveAgeYears(animal) {
  if (animal && animal.date_of_birth) {
    return parseFloat((monthsFromDob(animal.date_of_birth) / 12).toFixed(4));
  }
  return animal ? animal.age : null;
}

module.exports = { monthsFromDob, liveAgeYears, AVG_DAYS_PER_MONTH };
