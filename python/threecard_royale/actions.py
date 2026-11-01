"""actions-v2: stable token meanings, physical card IDs, atomic submission.

Prefix masks are pure queries. No RNG, reward or game state changes until submit.
"""
from copy import deepcopy
from .core import Game as LegacyGame, PHASES

VERSION, VOCAB, PAD, LENGTH = 'actions-v2', 65, 65, 6
NAMES = ['PLAY_3','PLAY_4','PLAY_5','SWAP','SKIP','STOP','ADVANCE','NEXT_GAME',
         'DECK','BLIND','OWN_HAND','OWN_WOUNDS','RIVAL_WOUNDS']
T = {name: 52+i for i, name in enumerate(NAMES)}
TARGETS = ['deck','blind','own_hand','own_wounds','rival_wounds']


def from_legacy(o, a):
    if a['type'] != 'swap':
        return deepcopy(a)
    t = a['target']
    zone = t['zone'] if t['zone'] in ('deck','blind') else 'own_'+t['zone'] if t['who'] == o['player'] else 'rival_wounds'
    target = {'zone': zone}
    if zone not in ('deck','blind'):
        target['card'] = o[t['zone']][t['index']] if t['who'] == o['player'] else o['enemy_wounds'][t['index']]
    return {'type':'swap', 'source':o[a['source']['zone']][a['source']['index']], 'target':target}


def tokens(a):
    kind = a['type']
    if kind == 'play':
        cs = a['cards']
        if len(cs) not in (3,4,5) or any(type(c) is not int or not 0 <= c < 52 for c in cs) or cs != sorted(set(cs)):
            raise ValueError('Expected 3/4/5 ascending physical card IDs')
        return [T['PLAY_'+str(len(cs))]] + cs
    if kind == 'swap':
        src, target = a['source'], a['target']
        if type(src) is not int or not 0 <= src < 52:
            raise ValueError('Invalid source card ID')
        z = TARGETS.index(target['zone'])
        seq = [T['SWAP'], src, 60+z]
        if z < 2:
            if set(target) != {'zone'}:
                raise ValueError('Blind / deck targets have no visible card ID')
        else:
            c = target['card']
            if type(c) is not int or not 0 <= c < 52:
                raise ValueError('Invalid target card ID')
            seq.append(c)
        return seq
    return [{'skip_swap':56,'stop_swaps':57,'advance':58,'next_game':59}[kind]]


class Grammar:
    def __init__(self, o):
        self.rows = []
        for i, a in enumerate(o['legal_actions']):
            action = deepcopy(a) if o.get('action_schema') == VERSION else from_legacy(o, a)
            self.rows.append({'action':action, 'legacy':deepcopy(a), 'index':i, 'tokens':tokens(action)})

    def next(self, prefix=()):
        p = list(prefix)
        if len(p) > LENGTH or any(type(t) is not int or not 0 <= t < VOCAB for t in p):
            raise ValueError('Invalid prefix')
        rows = [r for r in self.rows if r['tokens'][:len(p)] == p]
        if p and not rows:
            raise ValueError('Prefix has no legal completion')
        mask = [0]*VOCAB
        complete = any(len(r['tokens']) == len(p) for r in rows)
        for r in rows:
            if len(r['tokens']) > len(p):
                mask[r['tokens'][len(p)]] = 1
        return mask, complete

    def resolve(self, sequence):
        seq = list(sequence)
        if not seq or len(seq) > LENGTH:
            raise ValueError('Invalid sequence length')
        end = seq.index(PAD) if PAD in seq else len(seq)
        if any(t != PAD for t in seq[end:]):
            raise ValueError('PAD must be a suffix')
        seq = seq[:end]
        self.next(seq)
        for r in self.rows:
            if r['tokens'] == seq:
                return r
        raise ValueError('Incomplete action')

    def validate(self, action):
        row = self.resolve(tokens(action))
        if row['action'] != action:
            raise ValueError('Noncanonical action')
        return row


def state(o, episode='game'):
    import numpy as np
    result = np.zeros(336, np.float32)
    who = o['player']
    groups = [o['hand'],o['wounds'],o['enemy_wounds'],o['discard'],
              o['active'][who]['cards'] if o['active'][who] else [],
              o['active'][1-who]['cards'] if o['active'][1-who] else []]
    for i, cs in enumerate(groups):
        for c in cs:
            if c is not None:
                result[i*52+c] = 1
    result[312+PHASES.index(o['phase'])] = 1
    result[318:] = [o['levels'][0]/14,o['levels'][1]/14,o['flower_level']/14,
        min(len(o['wounds']),10)/10,min(len(o['enemy_wounds']),10)/10,o['enemy_hand_count']/8,
        o['deck_count']/52,len(o['discard'])/52,o['a_losses'][0]/3,o['a_losses'][1]/3,
        int(o['first']==who),int(o['attacker']==who),o['battle_index'],
        (o['pending']['remaining'] if o['pending'] else 0)/7,int(o['actor']==who),
        min(o['round'],1024)/1024,min(o['game'],1024)/1024,int(episode=='match')]
    return result


def prefix_features(prefix):
    import numpy as np
    if len(prefix) >= LENGTH or any(type(t) is not int or not 0 <= t < VOCAB for t in prefix):
        raise ValueError('Expected an incomplete prefix of integer tokens 0..64')
    result = np.zeros((LENGTH,VOCAB+1),np.float32)
    for i in range(LENGTH):
        result[i,prefix[i] if i<len(prefix) else PAD] = 1
    return result.ravel()


def observation(o):
    out = deepcopy(o)
    out['action_schema'] = VERSION
    out['legal_actions'] = [r['action'] for r in Grammar(o).rows]
    return out


class Game(LegacyGame):
    """Existing save format/rules plus explicit v2 entry points."""
    def grammar(self):
        o = super().observation(self.actor if self.actor is not None else 0)
        o['legal_actions'] = super().legal_actions()
        return Grammar(o)

    def structured_observation(self, who=None):
        return observation(super().observation((self.actor if self.actor is not None else 0) if who is None else who))

    def step_structured(self, action):
        return super().step(self.grammar().validate(action)['legacy'])

    def step_tokens(self, sequence):
        return super().step(self.grammar().resolve(sequence)['legacy'])
