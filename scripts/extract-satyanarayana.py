import re,json,pathlib
root=pathlib.Path(__file__).resolve().parents[1];s=(root/'docs/pujas/sri-satyanarayana-vratham-master.md').read_text()
def plain(t):
 t=re.sub(r'\[([^]]+)\]\([^)]+\)',r'\1',t)
 t='\n'.join(' · '.join(c.strip() for c in line.strip().strip('|').split('|')) if line.strip().startswith('|') else line for line in t.splitlines() if not re.match(r'^\s*\|[\s|:-]+\|\s*$',line))
 return t.replace('**','').replace('*','').replace('`','').strip()
def fields(b):
 out={};ms=list(re.finditer(r'^- \*\*([^*]+)\*\*\s*',b,re.M))
 for i,m in enumerate(ms):out[m[1].rstrip(':')]=b[m.end():ms[i+1].start() if i+1<len(ms) else len(b)].strip().rstrip('-').strip()
 return out
def quoted(t):return '\n'.join(re.sub(r'\s*⟨[^⟩]*⟩', '', re.sub(r'^> ?', '',x)) for x in t.splitlines() if x.startswith('>')).strip()
steps=[]
for m in re.finditer(r'^#### (SNV-[^\n]+)\n(.*?)(?=^#### SNV-|^## 4\.|\Z)',s,re.M|re.S):
 heading=m[1];b=m[2].split('\n### Phase')[0];f=fields(b);key=heading.split(' · ')[0];title=heading.split(' · ')[1];tm=re.search(r'\(([^()] *[^()]*)\)$',title);te=tm[1] if tm else title
 en=re.sub(r' \([^()]*[\u0c00-\u0c7f][^()]*\)$','',title)
 say=next((v for k,v in f.items() if 'Telugu script' in k),'');roman=next((v for k,v in f.items() if 'IAST' in k),'')
 rec=quoted(say);rom=quoted(roman)
 if not rom and roman.startswith('*'):rom=roman.split('*')[1]
 if key=='SNV-40':
  rows=[[c.strip() for c in line.strip('|').split('|')] for line in say.splitlines() if re.match(r'\| \d+ \|',line)]
  assert len(rows)==108
  endings=[re.sub(r'^> ?', '',line) for line in say.splitlines() if line.startswith('>')]
  rec='\n'.join([row[1] for row in rows]+[line for line in endings if re.search(r'[\u0c00-\u0c7f]',line)])
  rom='\n'.join([row[2] for row in rows]+[line for line in endings if not re.search(r'[\u0c00-\u0c7f]',line)])

 how=next((v for k,v in f.items() if k.startswith('How')),'')
 what=f.get('What to do','');ex=f.get('English explanation','');teex=f.get('తెలుగు వివరణ','')
 # Never ship the married-householder template or gift-template placeholders as recitation.
 if key in ['SNV-05','SNV-61']:rec='';rom=''
 if key=='SNV-05':
  followingTe=quoted(say).split('\n')[-1];followingRoman=quoted(roman).split('\n')[-1]
 else: followingTe='';followingRoman=''
 if key in [f'SNV-{n}' for n in range(13,22)]:
  how=plain(s.split('**How to act in each Navagraha step (same for all nine):**')[1].split('**Who (all of Phase D):**')[0])
 if key=='SNV-P2': f['Materials']='Prepared altar, cloth, rice, water pot, image, turmeric Ganapati, nine rice heaps, lamp, and offerings.'
 if key=='SNV-P3': f['Materials']='Wheat flour or rava (or rice flour/rava), ghee, sugar or jaggery, bananas, water and milk according to your chosen recipe.'
 data=dict(followingTe=followingTe,followingRoman=followingRoman,sourceStep=key,id='satyanarayana-'+key[4:].lower(),title=en,teluguTitle=te,what=plain(what),how=plain(how),meaning=plain(ex),instructionTe=plain(teex),mantraTe=rec,roman=rom,source=plain(f.get('Source','')),materials=plain(f.get('Materials','')),optional=plain(f.get('Optional','')))
 if key=='SNV-P3':
  data['readingEn']=plain(s.split('### 2.4 ')[1].split('### 2.5 ')[0])
  data['readingTe']='''ప్రసాదం: రెండు మూలాధార విధానాలు

ఒకటింపావు కొలత మూలాల్లో ఉంది. కింది కప్పుల పరిమాణాలు, వండే విధానం యాప్ బృందం ఇచ్చిన ఇంటి వంట సూచనలు. సుమారు 15–20 చిన్న భాగాలు వస్తాయి.

A. రవ్వతో (మోహన్ పేజీ 39లోని రవ్వ ఎంపిక): 1¼ కప్పుల గోధుమ రవ్వ లేదా బియ్యపు నూక, 1¼ కప్పుల చక్కెర లేదా బెల్లం, 1¼ కప్పుల పాలు, 1¼ కప్పుల నీళ్ళు, 1¼ కప్పుల నెయ్యి, 1¼ అరటిపండ్లు. బియ్యపు నూకకు మరో 1¼ కప్పుల నీళ్ళు వాడండి. తక్కువ నెయ్యి వాడటం ఇంటి వంట ఎంపిక, పూజా నియమం కాదు.

2–3 టేబుల్ స్పూన్ల నెయ్యిలో రవ్వను తక్కువ మంటపై 6–8 నిమిషాలు వేయించి పక్కన పెట్టండి. పాలు, నీళ్ళు మరిగించి మంట తగ్గించండి. రవ్వను మెల్లగా వేస్తూ కలపండి. గోధుమ రవ్వ 3–4 నిమిషాలు, బియ్యపు నూక 10–15 నిమిషాలు మెత్తగా ఉడికించండి. చక్కెర లేదా బెల్లం కలపండి. అరటిపండు గుజ్జు, మిగిలిన నెయ్యి కొద్దికొద్దిగా కలుపుతూ పాత్ర అంచులను విడిచే వరకు మరో 5–8 నిమిషాలు ఉడికించండి. గిన్నెలోకి తీసి మూతపెట్టండి.

B. పిండితో (మూల గ్రంథం, సంస్కృత కథలోని పిండి ఎంపిక): 1¼ కప్పుల గోధుమ పిండి లేదా బియ్యపు పిండి, 1¼ కప్పుల చక్కెర లేదా బెల్లం, 1¼ కప్పుల నెయ్యి లేదా మీ వంట ఎంపిక ప్రకారం తక్కువ, 1¼ అరటిపండ్లు. సుమారు 2½ కప్పుల నీళ్ళు, లేదా సగం పాలు సగం నీళ్ళు. మూల గ్రంథం పాలను పేర్కొనలేదు; ఈ విధానంలో పాలు ఐచ్ఛికం.

సగం నెయ్యిలో పిండిని తక్కువ మంటపై కలుపుతూ వేయించండి: గోధుమ పిండి 8–10 నిమిషాలు, బియ్యపు పిండి 5–6 నిమిషాలు. వేరే పాత్రలో ద్రవాన్ని చక్కెర లేదా బెల్లంతో వేడిచేయండి. పిండి పాత్రను మంట నుంచి దించి, గోరువెచ్చని ద్రవాన్ని మెల్లగా పోస్తూ ఉండలు లేకుండా కలపండి. మళ్ళీ తక్కువ మంటపై 5–8 నిమిషాలు చిక్కబడే వరకు ఉడికించండి. అరటిపండు గుజ్జు, మిగిలిన నెయ్యి కలిపి మరో 2–3 నిమిషాలు వండండి. గిన్నెలోకి తీసి మూతపెట్టండి.

ఏలకులు, జీడిపప్పు, కిస్మిస్ ఆచారంగా వేసేవి; మూలాల్లో లేవు. పాలు, నెయ్యిలో పాల పదార్థాలు ఉంటాయి; గోధుమల్లో గ్లూటెన్ ఉంటుంది; జీడిపప్పు అలెర్జీ కలిగించవచ్చు. బియ్యపు పిండి లేదా నూక గ్లూటెన్ లేని మూలాధార ఎంపికలు. పాల పదార్థాలు లేని మూలాధార విధానం దొరకలేదు. అలెర్జీ ఉన్నవారికి సురక్షితమైన పండు లేదా విడిగా చేసిన తీపి పదార్థం ఇవ్వండి; అది ఆహార భద్రత ఎంపిక. చేతులు, పాత్రలు శుభ్రంగా ఉంచండి. ప్రసాదం మూతపెట్టి ఉంచి, గది ఉష్ణోగ్రతలో సుమారు రెండు గంటలకు మించి ఉంచకుండా మిగిలినది ఫ్రిజ్‌లో పెట్టండి.'''
 if key=='SNV-61':data['how']=plain(f['When it applies'])+'\n\nThe personal gift formula is not included in this household guide. If you choose to make this gift with a priest present, let the priest guide it. No recipient or performer lineage is filled in by the app.'
 if key in [f'SNV-{n}' for n in range(53,58)]:
  n=int(key[4:])-52
  chapter=s.split(f'### 6.{n} ')[1].split(f'### 6.{n+1} ')[0].split('\n## 7.')[0]
  tebody=chapter.split(f'#### 6.{n}.1 తెలుగు')[1].split(f'#### 6.{n}.2 English')[0].strip()
  enbody=chapter.split(f'#### 6.{n}.2 English')[1].strip().rstrip('-').strip()
  # Editorial notes are not story narration.
  tebody=re.split(r'\n\*Note|\n\*గమనిక',tebody)[0].strip();enbody=re.split(r'\n\*Note',enbody)[0].strip()
  data['readingEn']=enbody;data['readingTe']=tebody
  data['how']='Read the opening salutation, the full chapter below, and then the closing line.'
  opening=next(x for x in steps if x['sourceStep']=='SNV-52')
  data['openingTe']=opening['mantraTe'];data['openingRoman']=opening['roman']
 steps.append(data)
assert len(steps)==66
assert all(x['source'] for x in steps)
materials=[]
for line in s.split('### 2.2 ')[1].split('### 2.3 ')[0].splitlines():
 if not re.match(r'\| \d+ \|',line):continue
 cells=[plain(x) for x in line.strip('|').split('|')];num,name,qty,used,status,source=cells
 match=re.search(r'\(([^()]*[\u0c00-\u0c7f][^()]*)\)',name)
 materials.append(dict(id='satya-material-'+num,name=name,nameTe=match[1] if match else '',quantity=qty,used=used,status=status,source=source))
assert len(materials)==38
(root/'lib/pujas/satyanarayana/content.json').write_text(json.dumps(dict(masterVersion='1.2',steps=steps,materials=materials),ensure_ascii=False,indent=2)+'\n')
print('Extracted',len(steps),'steps,',len(materials),'materials; chapters:',[(x['sourceStep'],len(x.get('readingEn','')),len(x.get('readingTe',''))) for x in steps if 'openingTe'in x])
