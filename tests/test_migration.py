from playwright.sync_api import sync_playwright
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
html=(R/'index.html').read_text()
data=json.loads((R/'memorias/1127_memorias.json').read_text())['memories']
old=[{**m,'id':f'legado-{i}','createdAt':'2026-10-10T00:00:00Z'} for i,m in enumerate(data[:127-1])]
old[0]['fact']='Guido van Rossum: memória personalizada pelo usuário.'
legacy=json.dumps({'version':3,'memories':old,'history':[{'id':'u1','role':'user','text':'Olá'}], 'weights':{'antigo|termo':2}},ensure_ascii=False)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 def create(saved):
  page=browser.new_page()
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.evaluate('''saved=>{const db=new Map([['thigas-synapse-v2',saved]]);Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,v)}});}''',saved)
  page.set_content(html,wait_until='load')
  return page,errors
 page,errors=create(legacy)
 assert page.locator('#count').inner_text()=='1126',page.locator('#count').inner_text()
 saved=page.evaluate("JSON.parse(localStorage.getItem('thigas-synapse-v2'))")
 assert saved['memories'][0]['fact']==old[0]['fact'],'alteração do usuário sobrescrita'
 assert saved['history'][0]['text']=='Olá'
 assert len(saved['deletedSubjects'])==1,saved['deletedSubjects']
 assert not errors,errors
 newpage,errors2=create(json.dumps(saved,ensure_ascii=False))
 assert newpage.locator('#count').inner_text()=='1126','memória excluída reapareceu após atualização'
 # Delete a built-in subject in v4 and confirm that it remains absent.
 newpage.locator('#memoriesBtn').click();newpage.locator('#memorySearch').fill('algoritmo')
 first=newpage.locator('.memory-row').filter(has_text='algoritmo').first
 subject=first.locator('strong').inner_text()
 newpage.on('dialog',lambda dialog:dialog.accept())
 first.get_by_text('Excluir',exact=True).click()
 out=json.loads(newpage.evaluate("localStorage.getItem('thigas-synapse-v2')"))
 assert subject not in [x['subject'] for x in out['memories']]
 updated,errors3=create(json.dumps(out,ensure_ascii=False))
 assert subject not in [x['subject'] for x in json.loads(updated.evaluate("localStorage.getItem('thigas-synapse-v2')"))['memories']]
 assert not errors2+errors3,errors2+errors3
 browser.close()
print('PASS: migração v3→v4 sem perder dados, respeito à exclusão anterior, edição preservada, exclusão v4 duradoura e sem erros JS.')
