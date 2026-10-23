#!/usr/bin/env python3
"""Build the bilingual A4 quick reference from reviewed Standard 1.0 copy.

Requires reportlab. Uses embedded font subsets and the canonical flat brand mark.
See docs/ONE_PAGER.md for font overrides, rendering and review instructions.
"""
import argparse
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing, Group, Rect
from reportlab.graphics.svgpath import SvgPath
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parents[1]
W, H = A4
M, GAP = 34, 24
COL = (W - 2*M - GAP)/2
RIGHT = M + COL + GAP
TOKENS = json.loads((ROOT/'app/theme-tokens.js').read_text().removeprefix('window.SZThemeTokens=').rstrip(';\n'))
THEME, CARD, BRAND = TOKENS['light'], TOKENS['card'], TOKENS['brand']
INK, MUTED = THEME['ink'], THEME['muted']
RED, GREEN, LINE = THEME['redText'], THEME['greenText'], THEME['line']
PAPER = THEME['paper']

COPY = {
 'zh-CN': {
  'brand': '深圳花牌', 'label': 'A4 规则速查', 'version': '标准规则 1.0',
  'tagline': '一副牌，两个人，三张牌，打出花。',
  'setup': '开局',
  'setup1': '<b>52 张牌 · 去大小王 · 每人 8 张 · 从 2 级开始</b>',
  'setup2': '手牌保密，伤牌区起始为空；首局随机先攻。',
  'setup3': '首局花牌是 <b>♥2</b>（共用百搭）；以后按上局赢家升级后的红桃点数。整局固定。',
  'scores': '牌型与分数', 'points': '分',
  'types': ['五炸', '四炸', '三炸', '同花顺', '同花', '顺子', '对子', '高牌'],
  'compare': '<b>先比分数，再比点数。</b>A 最高，2 最低；对子先比对，再比单张。同花／高牌逐张比。花色不分大小。',
  'straight': 'A23 最小，QKA 最大，KA2 不是顺子。',
  'five': '五炸 = 四张自然同点牌 + 花牌。点数不能与花牌等级相同。图例以 ♥2 为花牌。',
  'play': '一次攻防',
  'play1': '<b>从自己的手牌、伤牌选牌，可混用。</b><br/>通常 3 张；4 张只可四炸，5 张只可五炸。<br/>先攻先亮牌，防守看牌后出牌；不必跟牌型。',
  'attack': '进攻赢', 'attackResult': '对手受伤 = 分差',
  'defense': '防守赢', 'defenseResult': '自己换牌机会 = 分差',
  'tie': '同牌型仅点数胜，按 1 结算；完全相同为 0。',
  'resolve': '<b>弃掉出牌 → 补回用过的伤牌 → 结算</b><br/>伤牌逐张补公开新牌，先攻方先补。再执行伤害或换牌；用伤牌不减伤。',
  'end': '<b>达到 5 伤，输掉本局。</b><br/>伤害算完整，不在 5 截断。',
  'swap': '换牌：每次都能放弃',
  'swapIntro': '每次交出自己的 1 张手牌或伤牌，可换：',
  'swapItems': ['对手手牌：随机盲换', '对手伤牌：指定公开牌', '自己的另一牌区：手牌 ↔ 伤牌', '牌库：先弃交出牌，再摸 1 张补原位'],
  'swapNote': '<b>不改变手牌／伤牌张数，不回血。</b><br/>跳过只用掉当前 1 次，其余机会仍可用。',
  'round': '一轮与补牌',
  'roundText': '双方各攻一次后补手牌到 <b>8 张</b>，本轮先攻者先补。<br/>先攻轮换：<b>甲 → 乙 → 乙 → 甲</b>。<br/>牌库空时重洗弃牌堆；伤牌不清空。',
  'level': '从 2 到 A，过关开花',
  'levelText': '<b>赢一局，按最终伤牌差升级，最高到 A。</b><br/>如对手 7 伤、你 2 伤，你升 5 级。',
  'owner': '<b>打级方 = 上局赢家</b>（首局为最初先攻者）。开局确定，整局不变；轮换先攻不换打级方。',
  'ace': '<b>只有打级方赢下自己的 A 局，才赢整场。</b><br/>升到 A 还没过关；双方都在 A，也只有本局打级方能过关。',
  'reset': '输掉自己打级的 A 局才计失败：前两次留在 A，第三次回 2、计数清零。对手等级保留。',
  'next': '下局收齐 52 张重洗，伤牌归零、各发 8 张。保留等级及未清零的冲 A 失败次数；上局赢家先攻。',
  'footer': '打印一页，放在牌桌旁。', 'qr': '完整规则 / 试玩',
 },
 'en': {
  'brand': '3Card Royale', 'label': 'A4 QUICK REFERENCE', 'version': 'Standard Rules 1.0',
  'tagline': 'One deck. Two players. Three cards. Make them bloom.',
  'setup': 'SETUP',
  'setup1': '<b>52 cards · no jokers · 8 cards each · start at level 2</b>',
  'setup2': 'Hands stay private; wounds start empty. Choose the first attacker at random.',
  'setup3': 'Shared wild: <b>♥2</b> first, then the heart of the last winner’s new level. Fixed for the game.',
  'scores': 'Hands & scores', 'points': 'pts',
  'types': ['Five of a kind', 'Four of a kind', 'Three of a kind', 'Straight flush', 'Flush', 'Straight', 'Pair', 'High card'],
  'compare': '<b>Compare score, then rank.</b> A high, 2 low. Pairs: pair then kicker. Flush / high card: compare high to low. Suits never break ties.',
  'straight': 'A23 is lowest, QKA highest. KA2 is not a straight.',
  'five': 'Five of a kind: all 4 natural cards + the wild, at a different rank from the wild. Examples use ♥2.',
  'play': 'Attack & defend',
  'play1': '<b>Use your hand, your face-up wounds, or both.</b><br/>Play 3 cards, or 4 / 5 only for four / five of a kind. Attacker reveals first; defender responds. No need to match the type or card count.',
  'attack': 'Attack wins', 'attackResult': 'Rival takes the score gap in wounds',
  'defense': 'Defense wins', 'defenseResult': 'Defender gets the gap in swap chances',
  'tie': 'Same type, rank-only win: 1. Exact tie: 0.',
  'resolve': '<b>Discard plays → refill used wounds → resolve.</b><br/>Refill wound slots face up, attacker first. Then apply wounds or swaps. Using wounds never heals.',
  'end': '<b>5+ wounds loses the game.</b><br/>Apply all wounds; do not stop counting at 5.',
  'swap': 'Swap - or skip',
  'swapIntro': 'Give 1 hand or wound card. Swap with:',
  'swapItems': ['Rival’s hand: random and unseen', 'Rival’s wounds: a chosen face-up card', 'Your other zone: hand ↔ wound', 'Deck: discard, draw into the same slot'],
  'swapNote': '<b>Counts stay fixed; no healing.</b><br/>Use or skip each chance independently.',
  'round': 'Rounds & refills',
  'roundText': 'Both attack once → refill hands to <b>8</b>, first attacker first. Next round, reverse who starts: <b>A → B → B → A</b>. Keep wounds. Empty deck? Shuffle the discards.',
  'level': 'Reach Ace. Win and bloom.',
  'levelText': '<b>Game winner climbs by the final wound gap, capped at A.</b> Rival has 7, you have 2: climb 5.',
  'owner': '<b>Level owner = last winner</b> (first game: initial attacker). Fixed for the whole game.',
  'ace': '<b>Win your own A game as level owner to win the match.</b> Reaching A is not enough. If both are at A, only the owner can clear it this game.',
  'reset': 'Only losing your own A game counts as a failure. Stay at A twice; third loss: reset to 2, clear failures. Rival keeps their level.',
  'next': 'New game: shuffle all 52, clear wounds, deal 8 each. Keep levels and unreset Ace failures. Last winner attacks first.',
  'footer': 'One page. Ready for the table.', 'qr': 'Full rules / play',
 },
}

EXAMPLES = [
 [('A','s'),('A','h'),('A','c'),('A','d'),('2','h')],
 [('7','s'),('7','h'),('7','c'),('7','d')],
 [('Q','s'),('Q','h'),('Q','c')],
 [('6','c'),('7','c'),('8','c')],
 [('3','d'),('8','d'),('K','d')],
 [('4','s'),('5','h'),('6','c')],
 [('9','s'),('9','h'),('K','c')],
 [('3','s'),('8','h'),('K','c')],
]


def load_fonts(args):
    for name, path in [('ZH', args.font_zh), ('ZHB', args.font_zh_bold),
                       ('EN', args.font_en), ('ENB', args.font_en_bold)]:
        if not Path(path).is_file():
            raise SystemExit(f'Font missing: {path}. Set the corresponding --font-* option.')
        index = args.zh_font_index if name.startswith('ZH') and path.lower().endswith('.ttc') else 0
        pdfmetrics.registerFont(TTFont(name, path, subfontIndex=index))
    for family in ('ZH','EN'):
        pdfmetrics.registerFontFamily(family, normal=family, bold=family+'B', italic=family, boldItalic=family+'B')


def mark_drawing():
    # Read canonical asset, never maintain another logo copy in the print code.
    def visit(el):
        tag = el.tag.split('}')[-1]
        if tag == 'path':
            return SvgPath(el.attrib['d'], fillColor=HexColor(el.attrib['fill']), strokeColor=None)
        if tag == 'rect':
            a=el.attrib
            return Rect(*[float(a[k]) for k in ('x','y','width','height')], rx=float(a.get('rx',0)), ry=float(a.get('rx',0)), fillColor=HexColor(a['fill']), strokeColor=HexColor(a['stroke']), strokeWidth=float(a['stroke-width']))
        g=Group()
        for child in el:
            g.add(visit(child))
        transform=el.attrib.get('transform','')
        if transform:
            match=re.fullmatch(r'rotate\(([-\d.]+) ([-\d.]+) ([-\d.]+)\)',transform)
            if not match: raise ValueError('Unsupported canonical mark transform: '+transform)
            angle,cx,cy=map(float,match.groups())
            g.translate(cx,cy); g.rotate(angle); g.translate(-cx,-cy)
        return g
    art=visit(ET.parse(ROOT/'brand-mark.svg').getroot())
    art.translate(0,64); art.scale(1,-1)
    d=Drawing(64,64); d.add(art)
    return d


class Sheet:
    def __init__(self, lang, output):
        self.lang, self.copy = lang, COPY[lang]
        self.font = 'ZH' if lang=='zh-CN' else 'EN'
        self.size = 9.4 if lang=='zh-CN' else 9.5
        self.leading = 14.2 if lang=='zh-CN' else 13.6
        self.c = canvas.Canvas(str(output), pagesize=A4, pageCompression=1, invariant=1)
        self.c.setTitle(self.copy['brand']+' | '+self.copy['label']+' | '+self.copy['version'])
        self.c.setAuthor('深圳花牌 / 3Card Royale')
        self.c.setSubject('Standard Rules 1.0 - printable A4 quick reference')
        self.c.setCreator('scripts/build-onepager.py / ReportLab')

    def text(self, x, y, txt, size=10, bold=False, color=INK, align='left', font=None):
        c=self.c; c.setFillColor(HexColor(color)); c.setFont(font or self.font+('B' if bold else ''),size)
        getattr(c, {'left':'drawString','right':'drawRightString','center':'drawCentredString'}[align])(x,H-y,txt)

    def paragraph(self, x, top, width, txt, size=None, color=INK, leading=None):
        style=ParagraphStyle('body',fontName=self.font,fontSize=size or self.size,leading=leading or self.leading,textColor=HexColor(color),alignment=TA_LEFT,wordWrap='CJK' if self.lang=='zh-CN' else None,allowWidows=0,allowOrphans=0)
        p=Paragraph(txt,style); _,height=p.wrap(width,H)
        p.drawOn(self.c,x,H-top-height)
        return top+height

    def rule(self, y, x=M, width=None):
        self.c.setStrokeColor(HexColor(LINE)); self.c.setLineWidth(.6)
        self.c.line(x,H-y,x+(width or W-2*M),H-y)

    def heading(self, x, y, number, title):
        self.text(x,y,number,9,True,RED,font='ENB')
        self.text(x+24,y,title,13.5,True)

    def card(self,x,top,rank,suit,wild=False):
        c=self.c; cw,ch=18.7,23
        c.setFillColor(HexColor(THEME['goldTint'] if wild else CARD['face']))
        c.setStrokeColor(HexColor(BRAND['goldEdge'] if wild else CARD['edge'])); c.setLineWidth(.55)
        c.roundRect(x,H-top-ch,cw,ch,2.7,fill=1,stroke=1)
        color=CARD['red'] if suit in 'hd' else CARD['ink']
        self.text(x+3.2,top+10.6,rank,9.5,True,color,font='ENB')
        self.text(x+3.4,top+19.5,dict(s='♠',h='♥',c='♣',d='♦')[suit],8,False,color,font='EN')

    def make(self):
        c,t=self.c,self.copy
        logo=mark_drawing(); logo.scale(.64,.64)
        renderPDF.draw(logo,c,M-6,H-71)
        self.text(M+42,59,t['brand'],27 if self.lang=='zh-CN' else 26,True)
        self.text(W-M,40,t['label'],9,True,RED,align='right')
        self.text(W-M,57,t['version'],9,color=MUTED,align='right')
        self.text(M,88,t['tagline'],11,color=MUTED)
        self.rule(101)
        c.setFillColor(HexColor(PAPER)); c.roundRect(M,H-185,W-2*M,71,6,fill=1,stroke=0)
        self.text(M+12,132,t['setup'],10,True,RED)
        self.paragraph(M+68,122,W-2*M-80,t['setup1'],size=10,leading=14)
        self.paragraph(M+12,144,W-2*M-24,t['setup2'],size=9.4,leading=13)
        self.paragraph(M+12,162,W-2*M-24,t['setup3'],size=9.1,leading=12.4)

        self.heading(M,214,'01',t['scores'])
        self.text(M+COL,213,t['points'],8,color=MUTED,align='right')
        for i,(name,example) in enumerate(zip(t['types'],EXAMPLES)):
            y=228+i*26
            self.text(M,y+15,name,10 if self.lang=='zh-CN' else 9.4,True)
            for j,(rank,suit) in enumerate(example):
                self.card(M+101+j*21,y,rank,suit,wild=(i==0 and j==4))
            self.text(M+COL,y+16,str(7-i),14,True,RED,align='right',font='ENB')
        y=self.paragraph(M,444,COL,t['compare'],size=8.6,leading=12)
        y=self.paragraph(M,y+4,COL,t['straight'],size=8.1,color=MUTED,leading=11)
        y=self.paragraph(M,y+4,COL,t['five'],size=8.1,color=MUTED,leading=11)
        assert y<520,('scores overflow',self.lang,y)

        self.heading(RIGHT,214,'02',t['play'])
        y=self.paragraph(RIGHT,231,COL,t['play1'])
        y+=13
        for key,result,color in [('attack','attackResult',RED),('defense','defenseResult',GREEN)]:
            c.setFillColor(HexColor(PAPER)); c.roundRect(RIGHT,H-y-42,COL,42,4,stroke=0,fill=1)
            self.text(RIGHT+10,y+15,t[key],10.5,True,color)
            self.text(RIGHT+10,y+31,t[result],9.3,color=INK)
            y+=47
        y=self.paragraph(RIGHT,y+2,COL,t['tie'],size=8.6,color=MUTED,leading=12)
        y=self.paragraph(RIGHT,y+13,COL,t['resolve'])
        y=self.paragraph(RIGHT,y+13,COL,t['end'])
        assert y<520,('play overflow',self.lang,y)
        self.rule(529)

        self.heading(M,554,'03',t['swap'])
        y=self.paragraph(M,570,COL,t['swapIntro'])
        for i,item in enumerate(t['swapItems']):
            self.text(M,y+14,str(i+1),8.5,True,RED,font='ENB')
            y=self.paragraph(M+16,y+4,COL-16,item,size=9.3,leading=13)
        y=self.paragraph(M,y+9,COL,t['swapNote'],size=9,leading=13)
        self.heading(M,y+24,'04',t['round'])
        y=self.paragraph(M,y+39,COL,t['roundText'],size=9,leading=13)
        assert y<768,('swap/round overflow',self.lang,y)

        self.heading(RIGHT,554,'05',t['level'])
        y=self.paragraph(RIGHT,570,COL,t['levelText'])
        y=self.paragraph(RIGHT,y+10,COL,t['owner'],size=9,leading=13)
        y=self.paragraph(RIGHT,y+10,COL,t['ace'],size=9.3,leading=13.4)
        y=self.paragraph(RIGHT,y+10,COL,t['reset'],size=9,leading=13)
        y=self.paragraph(RIGHT,y+10,COL,t['next'],size=8.6,leading=12.4,color=MUTED)
        assert y<768,('level overflow',self.lang,y)

        self.rule(777)
        self.text(M,798,t['footer'],10.3,True)
        self.text(M,815,'lucienzhu.github.io/3card-royale',8,color=MUTED,font='EN')
        self.text(W-M-61,800,t['qr'],8.4,True,color=MUTED,align='right')
        self.text(W-M-61,815,'A4 · 1 / 1',8,color=MUTED,align='right',font='EN')
        url='https://lucienzhu.github.io/3card-royale/rules.html?lang='+self.lang
        qr=QrCodeWidget(url,barLevel='M'); bounds=qr.getBounds(); size=49
        art=Drawing(size,size,transform=[size/(bounds[2]-bounds[0]),0,0,size/(bounds[3]-bounds[1]),0,0]); art.add(qr)
        renderPDF.draw(art,c,W-M-size,H-824)
        c.linkURL(url,(W-M-size,H-824,W-M,H-775),relative=0)
        c.linkURL('https://lucienzhu.github.io/3card-royale/?lang='+self.lang,(M,H-818,M+240,H-806),relative=0)
        c.showPage(); c.save()


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output-dir',type=Path,default=ROOT/'output/pdf')
    p.add_argument('--font-zh',default='/System/Library/Fonts/STHeiti Light.ttc')
    p.add_argument('--font-zh-bold',default='/System/Library/Fonts/STHeiti Medium.ttc')
    p.add_argument('--zh-font-index',type=int,default=1,help='Simplified Chinese subfont for the default TTCs')
    p.add_argument('--font-en',default='/System/Library/Fonts/Supplemental/Arial.ttf')
    p.add_argument('--font-en-bold',default='/System/Library/Fonts/Supplemental/Arial Bold.ttf')
    args=p.parse_args(); load_fonts(args); args.output_dir.mkdir(parents=True,exist_ok=True)
    for lang in COPY:
        output=args.output_dir/('shenzhen-flower-rules-a4.'+lang+'.pdf')
        Sheet(lang,output).make(); print(output)

if __name__=='__main__': main()
