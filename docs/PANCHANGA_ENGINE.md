# Panchanga engine

The Panchanga engine produces location-aware calendrical results from explicit inputs and a versioned calculation method.

## Inputs

- Gregorian date or requested date range
- Geographic coordinates or a named location
- IANA timezone
- Calendar convention and regional settings
- Calculation method, ephemeris version, and ayanamsa where applicable

## Outputs

The five limbs are exposed as structured values with start and end instants:

- Tithi
- Vara
- Nakshatra
- Yoga
- Karana

Derived events such as sunrise, sunset, lunar phases, and observances must include their definition and source convention.

## Invariants

- Use timezone-aware instants internally.
- Never silently substitute a default location or timezone.
- Keep astronomical calculation separate from festival or observance rules.
- Test boundary conditions around midnight, sunrise, daylight-saving changes, and regional convention changes.
- Include the engine version and assumptions in every result.
