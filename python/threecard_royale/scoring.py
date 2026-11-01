"""scoring-v2: whole-action features with actions-v2 output, independent of model."""
from copy import deepcopy
import numpy as np
from .actions import Grammar, PAD, LENGTH
from .gym_env import encode_observation


def _descriptor_action(o, a):
    if a['type'] != 'swap':
        return a
    zone = 'hand' if a['source'] in o['hand'] else 'wounds'
    source = {'zone':zone, 'index':o[zone].index(a['source'])}
    t = a['target']
    if t['zone'] in ('deck','blind'):
        return {'type':'swap', 'source':source, 'target':{'zone':t['zone']}}
    own = t['zone'].startswith('own_')
    target_zone = 'hand' if t['zone'] == 'own_hand' else 'wounds'
    cards = o[target_zone] if own else o['enemy_wounds']
    return {'type':'swap', 'source':source, 'target':{
        'zone':target_zone, 'who':o['player'] if own else 1-o['player'], 'index':cards.index(t['card'])}}


def encode(o, episode='game'):
    rows = Grammar(o).rows
    if not 0 < len(rows) <= 512:
        raise ValueError('No supported legal decisions')
    f = encode_observation({**o, 'legal_actions':[_descriptor_action(o,r['action']) for r in rows]}, episode)
    return {'state':np.concatenate([f['cards'].ravel(),f['meta']]).astype(np.float32),
            'candidates':f['candidates'][:len(rows)].copy(),
            'actions':deepcopy([r['action'] for r in rows]),
            'tokens':np.array([r['tokens']+[PAD]*(LENGTH-len(r['tokens'])) for r in rows],np.int64)}


def choose(o, scores):
    rows = Grammar(o).rows
    values = np.asarray(scores)
    if not rows or values.shape != (len(rows),) or not np.isfinite(values).all():
        raise ValueError('Expected one finite score per complete legal action')
    return deepcopy(rows[int(values.argmax())]['action'])
