"""Render README layouts using the shipped pet SVG; demo values only. Requires Pillow + CJK font."""
from pathlib import Path
import argparse, re
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw, ImageFont

PAPER='#F5F2EB'; CARD='#FAF9F5'; INK='#34312B'; MUTED='#82796B'; LINE='#E2DCD0'; ACCENT='#B4694D'; SOFT='#EFE1D5'
args=argparse.ArgumentParser();args.add_argument('--font',required=True);opt=args.parse_args()
out=Path(__file__).resolve().parents[1]/'docs/assets';out.mkdir(parents=True,exist_ok=True)
def font(size,weight=400):
 f=ImageFont.truetype(opt.font,size)
 try:f.set_variation_by_axes([weight])
 except (AttributeError,ValueError,OSError):pass
 return f
def text(d,xy,s,size=24,color=INK,weight=400):d.text(xy,s,font=font(size,weight),fill=color)
def rr(d,box,fill=CARD,r=20,border=LINE):d.rounded_rectangle(box,r,fill=fill,outline=border,width=1)
def rule(d,x,y,w):d.line((x,y,x+w,y),fill=LINE,width=1)
def pill(d,x,y,s):
 w=int(d.textlength(s,font=font(18,500)))+32;rr(d,(x,y,x+w,y+38),SOFT,19,SOFT);text(d,(x+16,y+5),s,18,ACCENT,500);return w

def pixel_pet(d,x,y,scale=1):
 # Read the shipped artwork, rather than inventing a different mascot for docs.
 # This intentionally supports only the orthogonal SVG commands used by PET.
 source=(out.parents[1]/'pta-luna.user.js').read_text(encoding='utf-8')
 match=re.search(r"const PET = '([^']+)';",source)
 if not match:raise ValueError('PET SVG was not found in the userscript')
 def paint(element,inherited=ACCENT):
  fill=element.get('fill',inherited)
  if element.tag.rsplit('}',1)[-1]=='path':
   path=element.get('d','')
   if re.search(r'[^MmLlHhVvZz0-9.\-\s]',path):
    raise ValueError('PET SVG contains an unsupported path command')
   tokens=re.findall(r'[MmLlHhVvZz]|-?\d+(?:\.\d+)?',path)
   i=0;cx=cy=0;points=[];command=None
   while i<len(tokens):
    if tokens[i].isalpha():command=tokens[i];i+=1
    if command.upper()=='Z':
     if points:d.polygon([(x+px*scale,y+py*scale) for px,py in points],fill=fill);cx,cy=points[0]
     points=[];command=None;continue
    relative=command.islower();kind=command.upper()
    if kind in ('M','L'):
     px=float(tokens[i]);py=float(tokens[i+1]);i+=2
     cx=px+cx if relative else px;cy=py+cy if relative else py
     if kind=='M':
      if points:raise ValueError('PET has an unclosed subpath')
      command='l' if relative else 'L'
    elif kind=='H':
     value=float(tokens[i]);i+=1;cx=value+cx if relative else value
    elif kind=='V':
     value=float(tokens[i]);i+=1;cy=value+cy if relative else value
    else:raise ValueError('Unsupported PET path command')
    points.append((cx,cy))
   if points:raise ValueError('PET has an unclosed path')
  for child in element:paint(child,fill)
 paint(ET.fromstring(match.group(1)))

im=Image.new('RGB',(1440,540),PAPER);d=ImageDraw.Draw(im)
text(d,(64,42),'PTA  /  STUDY COMPANION',19,ACCENT,600)
text(d,(60,115),'少复制粘贴，',62,INK,650);text(d,(60,191),'多看代码。',62,INK,650)
text(d,(64,296),'接口直达判题，或在编辑器里看清录入过程。',24,MUTED)
x=64
for s in ['快速提交','模拟输入','双来源 · 额度可见']:x+=pill(d,x,365,s)+12
text(d,(64,455),'脚本猫 + 本地 Python 辅助程序  ·  MIT 开源',19,MUTED)
rr(d,(1014,60,1378,478),CARD,28)
text(d,(1044,87),'答题搭子',29,INK,550);text(d,(1046,131),'需要时展开，不用时陪伴。',18,MUTED)
pixel_pet(d,1098,177,6)
rule(d,1044,362,304);text(d,(1044,386),'ChatGPT 订阅  /  DeepSeek',19,INK,500)
text(d,(1044,422),'模型由你选，用量看得见。',18,MUTED)
im.save(out/'hero.png',optimize=True)

im=Image.new('RGB',(1440,850),PAPER);d=ImageDraw.Draw(im)
text(d,(44,30),'把选择权和用量，放在你看得见的地方。',34,INK,600)
text(d,(45,87),'Claude 风格简约布局 · Clawd 风格像素桌宠 · 数字为演示值',18,MUTED)
pixel_pet(d,1280,20,2.5)
# Left: root + usage submenu.
text(d,(44,150),'01  随手唤出的桌宠菜单',20,ACCENT,550)
rr(d,(44,197,365,520))
for i,s in enumerate(['摸摸','喂点心','打个招呼','现在忙什么','消耗体力','休息 / 唤醒']):
 y=214+i*46
 if i==4:rr(d,(56,y-2,353,y+37),SOFT,8,SOFT)
 text(d,(74,y),s,21,ACCENT if i==4 else INK)
 if i==4:text(d,(322,y),'›',24,ACCENT)
rr(d,(44,550,365,766));text(d,(70,568),'消耗体力',17,MUTED)
text(d,(70,607),'DeepSeek 费用',21);text(d,(70,650),'Codex 额度',21)
rule(d,68,696,270);text(d,(70,712),'返回',19,ACCENT)
# Middle: model choice.
text(d,(405,150),'02  手动选来源、模型与强度',20,ACCENT,550)
rr(d,(405,197,895,766));text(d,(435,222),'解题模型设置',30,INK,550)
for y,label,value in [(294,'模型来源','ChatGPT 订阅'),(412,'具体模型','GPT-6 Luna'),(530,'推理强度','轻度 · low')]:
 text(d,(437,y),label,18,MUTED);rr(d,(435,y+36,865,y+91),'#FFFEFA',10)
 text(d,(452,y+50),value,22);d.line([(831,y+59),(839,y+67),(847,y+59)],fill=MUTED,width=2)
text(d,(437,655),'先读取账号目录，再选择并保存。',18,MUTED)
rr(d,(435,704,865,748),ACCENT,10,ACCENT);text(d,(602,708),'保存设置',20,CARD,500)
# Right: quota and spend.
text(d,(935,150),'03  费用与额度，一眼看清',20,ACCENT,550)
rr(d,(935,197,1395,453));text(d,(963,223),'Codex 额度',28,INK,550);text(d,(1316,233),'Plus',17,MUTED)
text(d,(963,285),'5 小时',21,INK,500);text(d,(1105,285),'21%',22);text(d,(1158,290),'（−2.00）',17,ACCENT);text(d,(1312,287),'02:21',19,MUTED)
rule(d,962,333,405);text(d,(963,351),'1 周',21,INK,500);text(d,(1105,351),'55%',22);text(d,(1158,356),'（−1.00）',17,ACCENT);text(d,(1280,353),'10月22日',18,MUTED)
text(d,(963,414),'剩余额度 · 括号为变化百分点',16,MUTED)
rr(d,(935,481,1395,766));text(d,(963,506),'DeepSeek 费用',28,INK,550);text(d,(1291,518),'本页会话',16,MUTED)
text(d,(963,570),'累计估算',20);text(d,(1168,568),'¥0.007～0.014',22,INK,500)
text(d,(963,618),'2 次请求 · 输入 1,000 / 输出 1,500 token',17,MUTED)
rule(d,962,683,405);text(d,(963,707),'以实际账单为准',16,MUTED);text(d,(1270,707),'官方账单 ↗',17,ACCENT)
im.save(out/'interface.png',optimize=True)
print('Rendered hero.png and interface.png')
