"""Phone-based citizen dedup (ADR-8) — pure function, no session, no network."""

from collections.abc import Iterable


def citizen_count(complaints: Iterable) -> int:
    """Distinct citizens behind a set of complaints.

    Distinct non-null phones count once each; every phone-less (None)
    complaint counts as its own unique citizen (we cannot dedup the
    anonymous, and undercounting them would hurt equity).

    Accepts any iterable of objects exposing a ``.phone`` attribute.
    """
    phones: set[str] = set()
    anonymous = 0
    for complaint in complaints:
        if complaint.phone is None:
            anonymous += 1
        else:
            phones.add(complaint.phone)
    return len(phones) + anonymous
