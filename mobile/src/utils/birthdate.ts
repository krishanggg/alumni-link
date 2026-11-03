/**
 * Latest date the birthdate pickers may offer.
 *
 * The backend rule is `before:today`, evaluated on the server clock, which
 * runs **UTC** (`backend/config/app.php`). Deriving "yesterday" from the
 * *device* clock instead lets a device ahead of UTC compute a cap that is
 * still the server's *today*, so submitting the picker's own maximum fails
 * backend validation.
 *
 * Deriving the cap from UTC keeps it strictly behind the server's today for
 * any device east of UTC, and at most a day further back for any device west
 * of it — immaterial for a birthdate, which is never near today in practice.
 *
 * A client-side guard, not agreement on a shared clock with the backend. If
 * the backend timezone ever moves off UTC, revisit this with it.
 */
export function getLatestBirthdate(): Date {
  const now = new Date();
  const utcYesterday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
  );

  // Local midday on that calendar day so the native picker can't round the
  // bound onto a neighbouring day through the device's UTC offset.
  return new Date(
    utcYesterday.getUTCFullYear(),
    utcYesterday.getUTCMonth(),
    utcYesterday.getUTCDate(),
    12,
    0,
    0,
    0,
  );
}
