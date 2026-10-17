"""Render original README illustrations; demo values only. Requires Pillow + external CJK font."""
from pathlib import Path
import argparse
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

def crab(d,x,y,scale=1):
 # Original geometric mascot illustration, not a service-provider logo.
 for dx in [-1,1]:
  d.line((x+dx*45*scale,y+15*scale,x+dx*83*scale,y-8*scale),fill=ACCENT,width=int(9*scale))
  d.line((x+dx*42*scale,y+30*scale,x+dx*72*scale,y+58*scale),fill=ACCENT,width=int(7*scale))
  d.ellipse((x+dx*85*scale-18*scale,y-38*scale,x+dx*85*scale+18*scale,y-2*scale),fill=ACCENT)
 d.ellipse((x-56*scale,y-20*scale,x+56*scale,y+48*scale),fill=ACCENT)
 for dx in [-1,1]:
  d.line((x+dx*22*scale,y-5*scale,x+dx*24*scale,y-30*scale),fill=ACCENT,width=int(8*scale))
  d.ellipse((x+dx*24*scale-9*scale,y-40*scale,x+dx*24*scale+9*scale,y-22*scale),fill=INK)
 d.arc((x-10*scale,y+12*scale,x+10*scale,y+30*scale),0,180,fill=CARD,width=int(3*scale))

im=Image.new('RGB',(1440,540),PAPER);d=ImageDraw.Draw(im)
text(d,(64,42),'PTA  /  STUDY COMPANION',19,ACCENT,600)
text(d,(60,115),'少复制粘贴，',62,INK,650);text(d,(60,191),'多看代码。',62,INK,650)
text(d,(64,296),'题面、模型、提交、判题，放回同一个工作流。',24,MUTED)
x=64
for s in ['手动选模型','双来源接入','额度费用可见']:x+=pill(d,x,365,s)+12
text(d,(64,455),'脚本猫 + 本地 Python 辅助程序  ·  MIT 开源',19,MUTED)
rr(d,(1014,60,1378,478),CARD,28)
text(d,(1044,87),'答题搭子',29,INK,550);text(d,(1046,131),'需要时展开，不用时陪伴。',18,MUTED)
crab(d,1194,260,1.25)
rule(d,1044,362,304);text(d,(1044,386),'ChatGPT 订阅  /  DeepSeek',19,INK,500)
text(d,(1044,422),'模型由你选，用量看得见。',18,MUTED)
im.save(out/'hero.png',optimize=True)

im=Image.new('RGB',(1440,850),PAPER);d=ImageDraw.Draw(im)
text(d,(44,30),'把选择权和用量，放在你看得见的地方。',34,INK,600)
text(d,(45,87),'界面示意 · 数值为演示数据，模型与账号资格以实际接口为准',18,MUTED)
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
