"""Rebuild bilingual blog figures from the checked-in v2 history.

Optional plotting dependency: matplotlib. Pass an output directory, and optionally
--cjk-font /path/to/a/Chinese/font.ttc when the system has no CJK sans-serif font.
"""
import argparse, json, html
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
matplotlib.rcParams['svg.hashsalt'] = '3card-structured-v2'
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('output', type=Path)
parser.add_argument('--cjk-font')
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
history = json.loads((ROOT/'models/structured-policy/history.json').read_text())
ink, muted, green, pink, bg = '#10251C', '#526B60', '#16765F', '#C5416B', '#EDF4EF'
for en in (False, True):
    name = '-en' if en else ''
    def t(zh, english): return english if en else zh
    fig, ax = plt.subplots(figsize=(10,4.2), facecolor=bg)
    ax.set_facecolor(bg)
    font = FontProperties(fname=args.cjk_font) if not en and args.cjk_font else FontProperties(family='DejaVu Sans')
    for key, color, label in [('train',green,t('训练','Training')),('val',pink,t('验证','Validation'))]:
        ax.plot([r['epoch'] for r in history],[r[key]['loss'] for r in history],label=label,color=color,lw=2.5)
    best = min(history,key=lambda r:r['val']['loss'])
    ax.axvline(best['epoch'],color=muted,lw=1,ls='--',alpha=.7)
    ax.scatter([best['epoch']],[best['val']['loss']],color=pink,zorder=5,s=50)
    ax.annotate(t('第 16 轮 · 最低验证损失','Epoch 16 · lowest validation loss'),
        xy=(best['epoch'],best['val']['loss']),xytext=(21,.37),color=ink,fontproperties=font,
        arrowprops={'arrowstyle':'->','color':muted})
    ax.set_title(t('结构化 v2 · 每个完整动作等权','Structured v2 · equal weight per complete move'),fontproperties=font,loc='left',pad=20,color=ink,fontsize=15)
    ax.set_xlabel(t('训练轮次','Epoch'),fontproperties=font,color=muted)
    ax.set_ylabel(t('掩码交叉熵损失','Masked cross-entropy loss'),fontproperties=font,color=muted)
    ax.set_xlim(1,40);ax.tick_params(colors=muted);ax.grid(axis='y',alpha=.15)
    ax.legend(prop=font,frameon=False)
    for side in ['top','right']:ax.spines[side].set_visible(False)
    for side in ['bottom','left']:ax.spines[side].set_color('#B3C9BC')
    fig.tight_layout(pad=2)
    svg = args.output/f'structured-training{name}.svg'
    fig.savefig(svg,metadata={'Date':None})
    svg.write_text('\n'.join(line.rstrip() for line in svg.read_text().splitlines())+'\n')
    plt.close(fig)

    chunks = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 650" width="1000" height="650" role="img"><title>{t("固定动作与条件掩码","Fixed actions and conditional masks")}</title><rect width="1000" height="650" fill="{bg}"/><g font-family="Arial, sans-serif" fill="{ink}">']
    def rect(x,y,w,h,color='#F7FBF8',edge='#C4D7CB',r=10):
        chunks.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{color}" stroke="{edge}"/>')
    def text(x,y,value,size=18,color=ink,weight=400,anchor='start'):
        chunks.append(f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}" fill="{color}">{html.escape(str(value))}</text>')
    text(32,42,t('固定含义，逐步构造一个完整动作','Fixed meanings. Build one complete move.'),25,weight=700)
    text(32,76,t('牌 ID 0–51 · 出 3 / 4 / 5 张 · 换牌与流程操作','Card IDs 0–51 · play 3 / 4 / 5 cards · swaps and progression'),17,muted)
    rect(32,101,936,144)
    text(52,131,t('三个 A：先选张数，再选实体牌','Three Aces: choose the count, then the physical cards'),18,weight=700)
    for i,(label,id) in enumerate([('PLAY_3',52),('A♠',12),('A♥',25),('A♣',38)]):
        x=52+i*169
        rect(x,151,140,70,green if i==0 else '#FFFFFF')
        text(x+70,179,label,22,'#FFFFFF' if i==0 else pink if i==2 else ink,700,'middle')
        text(x+70,205,f'[{id}]',15,'#FFFFFF' if i==0 else muted,anchor='middle')
        text(x+154,191,'→',23,muted,anchor='middle')
    text(752,178,t('完整提交一次','Submit once'),20,green,700)
    text(752,205,t('GameCore 推进一步','One GameCore step'),16,muted)
    rect(32,263,455,222)
    text(52,296,t('当前前缀 → 下一步 mask','Selected prefix → next mask'),19,weight=700)
    text(52,326,'PLAY_3 → A♠ → A♥',19,muted)
    for i,(id,value) in enumerate([(0,0),(12,0),(18,0),(25,0),(38,1),(48,1)]):
        x=52+i*67
        rect(x,345,50,46,green if value else '#E2ECE5')
        text(x+25,375,value,22,'white' if value else muted,700,'middle')
        text(x+25,413,f'[{id}]',14,muted,anchor='middle')
    text(52,443,t('节选：1 可选；0 不可选','Excerpt: 1 allowed; 0 unavailable'),16,muted)
    text(52,467,t('已选牌 / 更小 ID 变 0，ID 含义不变','Used cards / lower IDs turn 0; IDs stay fixed'),15,muted)
    rect(507,263,461,222)
    text(527,296,t('换牌：来源 → 目标区域 → 目标牌','Swap: source → destination → target'),19,weight=700)
    text(527,333,'SWAP → 10♣ → RIVAL_WOUNDS → 3♠',17,green,700)
    text(527,365,'[55, 34, 64, 1]',18,muted)
    text(527,401,t('换牌堆 / 盲换：不指定暗牌 ID','Deck / blind: no hidden target-card ID'),16,muted)
    text(527,434,t('SKIP：跳过一次 · STOP：结束换牌','SKIP: one chance · STOP: remaining chances'),16,muted)
    text(527,466,t('最多 6 个 token；其余补 PAD = 65','At most 6 tokens; remaining slots use PAD = 65'),15,muted)
    rect(32,508,936,110,'#E2ECE5')
    text(52,544,t('当前状态 336 + 前缀 396','Current state 336 + prefix 396'),20,weight=700)
    text(512,544,'→ 256 → 128 → 65',25,green,700)
    text(52,586,t('共享 MLP 逐步预测 · 每步应用条件 mask · 完整动作才推进游戏','Shared MLP · conditional mask at every step · advance only after the complete move'),17,muted)
    chunks.append('</g></svg>')
    (args.output/f'structured-actions{name}.svg').write_text('\n'.join(chunks))
