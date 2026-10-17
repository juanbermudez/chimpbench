"""Which training rows an epoch shows (pure; no torch). Used by train_r11.py.

A row without an `epoch` field is shown in every epoch: the recipe of stages R11 and R15, unchanged. Stage R16's round one
(docs/staging/r16-prereg.md §8, equal exposure) writes, per row, the 0-based epoch or the list of epochs that show it, so
that the round shows as many examples as round zero did over the same three epochs.
"""


def shown_in(epoch_field, epoch):
    """True when a row whose `epoch` field is `epoch_field` (None, an int, or a list of ints) is shown in `epoch`."""
    if epoch_field is None:
        return True
    if isinstance(epoch_field, list):
        return epoch in epoch_field
    return epoch_field == epoch


def rows_seen(fields, last_epoch):
    """How many distinct rows epochs 0 to `last_epoch` show, of all rows (the share a saved epoch had seen)."""
    return sum(1 for f in fields if any(shown_in(f, e) for e in range(last_epoch + 1)))
