"""Atomic structured-action Gym. One step = one complete 1–6 token action.

Score complete legal moves, use code, or decode with action_masks(prefix).
All policies submit a complete padded sequence to step() once. Independent
MultiDiscrete heads cannot enforce the conditional legality of token choices.
"""
import gymnasium as gym
from gymnasium import spaces
import numpy as np
from .gym_env import RoyaleEnv
from .actions import Grammar, state, VOCAB, PAD, LENGTH, VERSION


class StructuredRoyaleEnv(RoyaleEnv):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.action_space = spaces.MultiDiscrete([VOCAB+1]*LENGTH)
        self.observation_space = spaces.Dict({
            'state': spaces.Box(0,1,(336,),np.float32),
            'action_mask': spaces.MultiBinary(VOCAB),
        })

    def _obs(self):
        o = self.game.observation(self.player)
        self._actions = o['legal_actions']
        self._grammar = Grammar(o)
        return {'state':state(o,self.episode), 'action_mask':np.array(self._grammar.next()[0],np.int8)}

    def action_masks(self, prefix=()):
        values = np.asarray(prefix)
        if values.ndim != 1 or (len(values) and not np.issubdtype(values.dtype,np.integer)):
            raise ValueError('Prefix must contain integer tokens')
        return np.array(self._grammar.next([int(t) for t in values])[0],bool)

    def scoring_observation(self):
        """Optional model input; selected row maps to a complete actions-v2 sequence."""
        from .scoring import encode
        if self._done:
            raise RuntimeError('Episode ended or not reset; call reset()')
        return encode(self.game.observation(self.player), self.episode)

    def step(self, action):
        # Decode without mutation. The inherited step applies the complete action once.
        index = -1
        try:
            values = np.asarray(action)
            if values.shape == (LENGTH,) and np.issubdtype(values.dtype,np.integer):
                index = self._grammar.resolve([int(x) for x in values])['index']
        except (ValueError, KeyError, TypeError):
            pass
        return super().step(index)

    def _info(self, **extra):
        return {**super()._info(**extra), 'action_schema':VERSION}


if 'ThreeCardRoyale-v1' not in gym.registry:
    gym.register('ThreeCardRoyale-v1', entry_point='threecard_royale.gym_structured:StructuredRoyaleEnv')
