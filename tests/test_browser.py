from playwright.sync_api import sync_playwright
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
html=(R/'index.html').read_text(encoding='utf8')
results=[]
def test(label,ok,description=''):
 results.append(bool(ok));print(('PASS' if ok else 'FAIL'),label,str(description)[:150])
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':1280,'height':800},accept_downloads=True)
 def create(saved=None,mobile=False):
  pg=browser.new_page(viewport={'width':390,'height':844} if mobile else {'width':1280,'height':800},accept_downloads=True)
  pg.on('pageerror',lambda e: errors.append(str(e)))
  pg.evaluate('''saved=>{const db=new Map();if(saved)db.set('thigas-synapse-v2',saved);Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>db.has(k)?db.get(k):null,setItem:(k,v)=>db.set(k,v),removeItem:k=>db.delete(k)}});}''', saved)
  pg.set_content(html,wait_until='load');return pg
 errors=[];page=create()
 test('inicializa 1127',page.locator('#count').inner_text()=='1127')
 count=int(page.locator('#synapseCount').inner_text().replace('.',''))
 test('sinapses conectadas',count>5000,count)
 def ask(pg,q):
  pg.locator('#userInput').fill(q);pg.locator('#sendBtn').click();return pg.locator('.message.assistant .message-text').last.inner_text()
 test('Python sinônimo','Guido van Rossum' in ask(page,'Quem inventou a linguagem Python?'))
 test('algoritmo exato','sequência finita' in ask(page,'O que é algoritmo?'))
 test('Java recusa','Não encontrei' in ask(page,'Quem criou Java?'))
 q=ask(page,'O que é segurança da informação?');test('tecnologia','segurança' in q.lower() or 'informação' in q.lower(),q)
 q=ask(page,'Quando começou a Revolução Francesa?');test('humanas','1789' in q,q)
 q=ask(page,'O que é indução eletromagnética?');test('exatas','fluxo magnético' in q,q)
 q=ask(page,'/sinapses');test('comando sinapses',str(count) in q.replace('.',''),q)
 test('sinapses UI',page.locator('.related-btn').count()>0,page.locator('.related-btn').count())
 page.locator('#teachBtn').click();page.locator('#teachSubject').fill('Teste Synapse Novo');page.locator('#teachFact').fill('Sinapse de teste integra a memória no navegador.');page.locator('#teachTags').fill('tecnologia, rede');page.locator('#teachAliases').fill('O que é teste synapse novo?');page.locator('#teachForm button[type=submit]').click()
 test('aprende conteúdo','Sinapse de teste' in ask(page,'O que é teste synapse novo?'))
 test('aumenta contador',page.locator('#count').inner_text()=='1128')
 saved=page.evaluate("localStorage.getItem('thigas-synapse-v2')")
 test('salvou no armazenamento',isinstance(saved,str) and 'Teste Synapse Novo' in saved)
 reload=create(saved)
 test('persistência',reload.locator('#count').inner_text()=='1128' and 'Sinapse de teste' in ask(reload,'O que é teste synapse novo?'))
 reload.locator('#memoriesBtn').click();num=reload.locator('.memory-row').count();test('lista limitada',0<num<=140,num)
 reload.locator('#memorySearch').fill('Teste Synapse Novo');test('filtro',reload.locator('.memory-row').count()==1)
 reload.locator('#closeMem').click()
 reload.evaluate('window.__xss = 0');reload.locator('#teachBtn').click();reload.locator('#teachSubject').fill('XSS teste validação');reload.locator('#teachFact').fill('<img src=x onerror="window.__xss=1">');reload.locator('#teachForm button[type=submit]').click()
 ask(reload,'XSS teste validação');test('sem XSS',reload.evaluate('window.__xss')==0)
 f=R/'tests'/'import_test.json';f.write_text(json.dumps({'memories':[{'subject':'Conceito incomum QA','fact':'Respostas de QA importadas.','aliases':['Explique conceito incomum QA']},{'subject':'Conceito incomum QA','fact':'Duplicado conflitante'}]}),encoding='utf8')
 reload.locator('#fileInput').set_input_files(str(f));reload.wait_for_timeout(200);f.unlink()
 test('importação sem duplicidade',reload.locator('#count').inner_text()=='1130',reload.locator('#count').inner_text())
 test('importação recuperável','Respostas de QA' in ask(reload,'Explique conceito incomum QA'))
 test('comando aprender','Aprendi' in ask(reload,'/aprender Nova memória pelo comando | Fato do teste de comando'))
 test('nenhum erro JS',not errors,errors)
 reload.screenshot(path=str(R/'tests'/'desktop.png'))
 mobile=create(mobile=True);mobile.locator('#menuBtn').click();test('menu mobile','mobile-open' in (mobile.locator('#sidebar').get_attribute('class') or ''))
 mobile.screenshot(path=str(R/'tests'/'mobile.png'))
 browser.close()
print('RESULTADOS',sum(results),'/',len(results))
if not all(results):raise SystemExit(1)
