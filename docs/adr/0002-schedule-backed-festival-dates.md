# ADR 0002: Schedule-backed festival dates (Bathukamma 2026)

Status: Accepted (2026-10-01)

## Context

Every festival in `lib/panchanga/festival-rules.ts` used to compute its date
from latitude, longitude and time zone. No production date was hard-coded.

Bathukamma's nine named days do not fit that model. The research in PR #12
(`docs/temp/bathukamma-2026-date-audit-2026-10-01.md`, revision 3) found
several documented conventions that disagree in some years and places:

- tithi at sunrise;
- a strict nine-day count;
- an "evening Ashtami" view;
- the Telangana Government's published date.

For the US cities the start day is genuinely unresolved (9 or 10 Oct 2026).
Writing a universal algorithm would have meant inventing an observance
rule, which `.claude/rules/sacred-content.md` forbids.

The product owner therefore chose an explicit 2026 schedule (10–18 Oct)
for nine named locations:

- **Hyderabad:** follows the Telangana Government 2026 schedule.
- **Frisco, Dallas, New York, Chicago, Los Angeles, San Francisco, San Jose and Seattle:** follow a selected sunrise-based nine-day schedule. This is a product decision, not a published source.

## Decision

1. **New method `"published-schedule"`.** The festival rule model has a new
   method. Its dates are data in `lib/panchanga/festival-schedules.ts`, not
   a computation.
   - The data covers one named year (2026) only.
   - There is no formula, so no other year ever gets a date.
2. **Locations are matched by the saved place, not by time zone.**
   - The saved city, region and country are compared with each location's
     accepted spellings. A blank region is allowed, because the location
     model allows it.
   - The saved coordinates must also be within 60 km of that city.
   - Time zone is never used. Research showed that sharing a time zone is
     not a reliable proxy for sharing an observance date.
   - Any other location gets no date. The festival simply does not appear.
3. **The place is passed into festival queries.**
   - The shared dispatcher (`festivalRuleOccurrence`) now accepts an
     optional `place`. Only schedule-backed rules read it.
   - Home, Calendar and Search pass the saved place.
   - Omitting the place means no schedule location can match.
4. **Each location keeps its own provenance.**
   - Each schedule location carries its own basis, evidence status
     (`published-date` or `product-selected`) and source URL.
   - Each also carries a sacred-content review status, `REVIEW_REQUIRED`.
     No date has been priest-reviewed.
   - Calendar's Reviewer-mode source line shows the resolved location's own
     basis.
   - Families see one short note under the festival list.
5. **Caching.**
   - `CALENDAR_ENGINE_VERSION` is bumped to `cal-17`.
   - Results now depend on the place's name, so the resolved schedule
     location is:
     - appended to the calendar cache key (only when the place resolves to
       a schedule location);
     - stored on the month and re-checked on every cached read;
     - included in Home's in-memory festival memo key.

## Consequences

- Adding Bathukamma for another year or another location is a new,
  explicitly sourced data entry. It is never inferred.
- A user in a city that is not listed sees no Bathukamma dates. Examples are
  Plano, Sunnyvale, Secunderabad, or any city whose saved name does not
  match.
- Moving this schedule to the `Provenance` record used by sacred content
  (reviewer, review date) can happen once a priest review exists. Today the
  festival catalogue's own fields are used, as for every other festival.
