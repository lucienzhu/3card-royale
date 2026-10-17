"""3Card Royale portable SDK. Gymnasium is an optional dependency."""

from .core import Game, RULES, evaluate, outcome
from .policy import choose_action

__version__ = "0.1.0"
__all__ = ["Game", "RULES", "evaluate", "outcome", "choose_action"]
