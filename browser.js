'use strict';
(() => {
 const STORE='thigas-synapse-v2'; // mesmo identificador: mantém dados do aplicativo anterior
 const $=id=>document.getElementById(id);
 const randomId=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
 const normal=ThigasNLP.normal;
 const tokenize=s=>[...new Set(ThigasNLP.tokens(s))].slice(0,30);
 const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
 const MAX_MEMORY=5000, MEMORY_PAGE=140;
 const blank=()=>({version:4,history:[],memories:[],deletedSubjects:[]});
 let storageOK=true, state=blank(), learning=false, editingId=null, toastTimer=null, recognize=null, listening=false, indexCache=null, graphCache=null, networkIdMap=null;
 let existed=false, loadError=false, oldVersion=0;
 try {
  const raw=localStorage.getItem(STORE);
  if(raw){
   const s=JSON.parse(raw);
   if(s && Array.isArray(s.memories)){
    existed=true;oldVersion=Number(s.version)||3;
    const validated=s.memories.filter(m=>m && typeof m.subject==='string' && m.subject.trim() && typeof m.fact==='string' && m.fact.trim());
    const cleaned=validated.slice(0,MAX_MEMORY).map(m=>({...m,
     id:typeof m.id==='string'&&m.id?m.id:randomId(),subject:m.subject.slice(0,256),fact:m.fact.slice(0,4000),
     tags:Array.isArray(m.tags)?m.tags.filter(x=>typeof x==='string').slice(0,20):[],
     aliases:Array.isArray(m.aliases)?m.aliases.filter(x=>typeof x==='string').slice(0,12):[],
     approved:m.approved!==false,confidence:clamp(Number(m.confidence)||.8,.1,.99)}));
    state={version:4,history:Array.isArray(s.history)?s.history.filter(x=>x && typeof x.text==='string' && ['user','assistant'].includes(x.role)).slice(-140):[],memories:cleaned,
     deletedSubjects:Array.isArray(s.deletedSubjects)?s.deletedSubjects.filter(x=>typeof x==='string').slice(-MAX_MEMORY):[]};
   }
  }
 }catch(e){loadError=true;storageOK=false;}
 // Migra bases anteriores sem substituir uma memória que o usuário já ensinou/editou.
 // Conteúdo embutido garante funcionamento por file:// e GitHub Pages.
 const known=new Set(state.memories.map(m=>ThigasNLP.normal(m.subject)));
 const deleted=new Set(state.deletedSubjects.map(ThigasNLP.normal));
 if(existed && oldVersion<4){
  for(const m of THIGAS_STARTER_MEMORIES){if(String(m.source).startsWith('base:')&&!known.has(ThigasNLP.normal(m.subject)))deleted.add(ThigasNLP.normal(m.subject));}
  state.deletedSubjects=[...deleted];
 }
 let migrated=0;
 for(const m of THIGAS_STARTER_MEMORIES){
  const key=ThigasNLP.normal(m.subject);
  if(known.has(key)||deleted.has(key)||(existed&&oldVersion<4&&!String(m.source).startsWith('biblioteca-educativa-1000:'))||state.memories.length>=MAX_MEMORY)continue;
  state.memories.push({...m,id:randomId(),createdAt:new Date().toISOString(),approved:true,confidence:Number(m.confidence)||.8});
  known.add(key);migrated++;
 }
 function getIndex(){if(!indexCache)indexCache=ThigasNLP.createIndex(state.memories);return indexCache;}
 function invalidateIndex(){indexCache=null;graphCache=null;networkIdMap=null;}
 function save(){try{localStorage.setItem(STORE,JSON.stringify(state));storageOK=true;}catch(e){storageOK=false;$('note').textContent='Sem armazenamento persistente: exporte seu JSON';}}
 function getGraph(){if(!graphCache){graphCache=ThigasSynapses.build(state.memories);networkIdMap=new Map(state.memories.map((m,i)=>[m.id,i]));}return graphCache;}
 function relatedTo(id,max=5){const g=getGraph(),i=networkIdMap.get(id);return i===undefined?[]:g.related(i,max);}

 function toast(msg){const el=$('toast');el.textContent=msg;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,3600);}
 function closeMobile(){ $('sidebar').classList.remove('mobile-open'); }
 function openOverlay(id){closeMobile();$('teachOverlay').hidden=true;$('memOverlay').hidden=true;$(id).hidden=false;}
 function closeOverlays(){$('teachOverlay').hidden=true;$('memOverlay').hidden=true;}
 function memoryCount(){
  $('count').textContent=String(state.memories.length);
  $('synapseCount').textContent=getGraph().total.toLocaleString('pt-BR');
  if(storageOK)$('note').textContent=state.memories.length.toLocaleString('pt-BR')+' memórias · '+getGraph().total.toLocaleString('pt-BR')+' conexões';
 }
 function welcome(){const wrap=document.createElement('div');wrap.className='welcome';
  wrap.innerHTML='<div class="logo-large">T</div><h2>O que vamos aprender hoje?</h2><p>Faça perguntas com suas próprias palavras. Consulte a biblioteca de memórias, ensine novos fatos ou importe arquivos JSON. Tudo roda localmente.</p>';
  const box=document.createElement('div');box.className='suggestions';
  for(const [title,subtitle,type] of [['Ensinar uma informação','Crie perguntas e respostas equivalentes','teach'],['Consultar conhecimento','Consulte a biblioteca completa','chat'],['Revisar memórias','Veja ou altere informações salvas','mem'],['Como funciona?','Entenda os limites deste assistente','help']]){
   const b=document.createElement('button');b.className='suggestion';b.type='button';const s=document.createElement('strong');s.textContent=title;const p=document.createElement('span');p.textContent=subtitle;b.append(s,p);
   b.onclick=()=>{if(type==='teach')openTeach();else if(type==='mem')openMemories();else if(type==='chat'){$('userInput').value='O que você sabe sobre ';$('userInput').focus();}else{submitText('Como você funciona?');}};box.appendChild(b);
  }wrap.appendChild(box);return wrap;
 }
 function renderMessage(item){const el=document.createElement('article');el.className='message '+(item.role==='user'?'user':'assistant');const body=document.createElement('div');body.className='message-body';if(item.role!=='user'){const av=document.createElement('span');av.className='avatar';av.textContent='T';el.appendChild(av);}const p=document.createElement('div');p.className='message-text';p.textContent=item.text||'';body.appendChild(p);
  if(item.role==='assistant'&&item.memId){const meta=document.createElement('div');meta.className='message-meta';const lab=document.createElement('span');lab.textContent='Resposta baseada em memória local';meta.appendChild(lab);for(const [val,label] of [[1,'Útil'],[-1,'Incorreta']]){const b=document.createElement('button');b.type='button';b.className='vote';b.textContent=label;b.setAttribute('aria-pressed',String(item.rating===val));b.onclick=()=>{rateAnswer(item.id,val);};meta.appendChild(b);}body.appendChild(meta);
  }
  if(item.role==='assistant' && item.memId){
   const related=relatedTo(item.memId,4);
   if(related.length){const rel=document.createElement('div');rel.className='related';const lab=document.createElement('span');lab.textContent='Sinapses relacionadas:';rel.appendChild(lab);
    for(const r of related){const button=document.createElement('button');button.type='button';button.className='related-btn';button.textContent=r.memory.subject;
     button.addEventListener('click',()=>submitText('Explique '+r.memory.subject));rel.appendChild(button);}body.appendChild(rel);
   }
  }
  el.appendChild(body);return el;
 }
 function renderChat(){const wrap=$('conversation');wrap.replaceChildren();if(!state.history.length)wrap.appendChild(welcome());else{for(const h of state.history)wrap.appendChild(renderMessage(h));}memoryCount();requestAnimationFrame(()=>{$('scroll').scrollTop=$('scroll').scrollHeight;});}
 // A rede depende das memórias, não de pares de palavras sem efeito na busca.
 function learnAssociation(){invalidateIndex();}
 function respond(q){
  const pure=normal(q).trim();
  if(/^(oi|ola|bom dia|boa tarde|boa noite)[!.\s]*$/.test(pure))return {text:'Olá! Sou o THIGAS Synapse v4, com uma biblioteca multidisciplinar e uma rede de sinapses temáticas. Pergunte sobre programação, exatas, humanas, linguagens, tecnologia ou psicologia.'};
  if(/^(?:como (?:voce )?funciona|como funciona (?:o )?(?:thigas )?synapse|o que voce faz|como usar (?:o )?synapse)$/.test(pure))return {text:'Utilizo PLN local leve: normalização, conceitos equivalentes, identificação de intenção, ranqueamento BM25 e vetores de características textuais. Busco entre as memórias cadastradas e recuso respostas sem evidência suficiente. Não sou uma LLM e não uso embeddings neurais. Minhas sinapses indicam proximidade temática, não verdades novas.'};
  const command=q.trim().toLowerCase();
  if(command==='/sinapses')return {text:'A rede contém '+getGraph().total.toLocaleString('pt-BR')+' associações temáticas entre '+state.memories.length.toLocaleString('pt-BR')+' memórias. Use /sinapses assunto para explorar.'};
  if(command.startsWith('/sinapses ')){
   const term=q.slice(10).trim();const found=ThigasNLP.query(getIndex(),term);
   if(!found.match)return {text:'Não identifiquei o assunto para consultar sinapses. Use um nome mais específico.'};
   const related=relatedTo(found.match.memory.id,10);
   return {text:'Sinapses associadas a “'+found.match.memory.subject+'”:\n'+(related.length?related.map(x=>'• '+x.memory.subject).join('\n'):'Nenhuma associação suficientemente relevante.'),memId:found.match.memory.id};
  }
  if(command.startsWith('/aprender ')){
   const match=q.slice(10).split('|');
   if(match.length>=2&&match[0].trim()&&match.slice(1).join('|').trim()){
    const mem=addMemory({subject:match[0].trim(),fact:match.slice(1).join('|').trim(),tags:[],aliases:[],approved:true});
    return {text:'Aprendi sobre “'+mem.subject+'”. Pode fazer essa pergunta de outra forma.',memId:mem.id};
   }
   return {text:'Use: /aprender assunto | explicação'};
  }
  const found=ThigasNLP.query(getIndex(),q);
  if(found.match){return {text:found.match.memory.fact,memId:found.match.memory.id,matchScore:found.match.score};}
  if(found.reason==='ambiguo' && found.alternatives.length>1){
   return {text:'Encontrei mais de um assunto possível. Você quer saber sobre “'+found.alternatives[0].memory.subject+'” ou “'+found.alternatives[1].memory.subject+'”? Tente incluir mais detalhes.'};
  }
  return {text:learning?'Ainda não encontrei uma memória suficientemente relevante. Cadastre uma explicação pelo botão “Ensinar” ou use /aprender assunto | explicação.':'Não encontrei uma resposta confiável nas memórias locais. Tente mencionar o assunto com mais detalhes ou importe outra biblioteca JSON. Não vou inventar uma resposta.'};
 }
 function addHistory(role,text,extra={}){const msg={id:randomId(),role,text,createdAt:new Date().toISOString(),...extra};state.history.push(msg);if(state.history.length>140)state.history=state.history.slice(-140);return msg;}
 function submitText(text){text=String(text||'').trim().slice(0,4000);if(!text)return;
  addHistory('user',text);let res;
  try{res=respond(text);}catch(e){res={text:'Não foi possível executar: '+String(e.message||'erro inesperado').slice(0,200)};}
  addHistory('assistant',res.text,{memId:res.memId||null,query:text});save();renderChat();}
 function addMemory(data,id=null,deferSave=false){
  const subject=String(data.subject||'').trim().slice(0,256),fact=String(data.fact||'').trim().slice(0,4000);
  if(!subject||!fact)throw Error('Assunto e explicação são obrigatórios.');
  const tags=Array.isArray(data.tags)?data.tags.map(x=>String(x).trim().slice(0,80)).filter(Boolean).slice(0,20):[];
  const aliases=Array.isArray(data.aliases)?data.aliases.map(x=>String(x).trim().slice(0,160)).filter(Boolean).slice(0,12):[];
  const approved=!!data.approved;
  let mem=editingId?state.memories.find(m=>m.id===editingId):null;
  if(mem && normal(mem.subject)!==normal(subject))state.deletedSubjects=[...new Set([...state.deletedSubjects,normal(mem.subject)])];
  state.deletedSubjects=state.deletedSubjects.filter(s=>normal(s)!==normal(subject));
  if(state.memories.some(m=>m.id!==mem?.id && normal(m.subject)===normal(subject)))throw Error('Este assunto já existe. Abra “Minhas memórias” para editar a resposta.');
  if(!mem){if(state.memories.length>=MAX_MEMORY)throw Error('Limite de '+MAX_MEMORY+' memórias. Exporte antes de ampliar.');mem={id:id||randomId(),createdAt:new Date().toISOString()};state.memories.push(mem);}
  const numeric=Number(data.confidence);
  Object.assign(mem,{subject,fact,tags,aliases,approved,confidence:clamp(Number.isFinite(numeric)&&numeric>0?numeric:.85,.1,.99),source:data.source||mem.source||(approved?'ensinado':'temporário')});
  // A confiança da memória retroalimenta o ranqueamento em avaliações futuras.
  invalidateIndex();if(!deferSave){save();memoryCount();}
  return mem;
 }
 function rateAnswer(messageId,rating){const h=state.history.find(x=>x.id===messageId);if(!h||!h.memId)return;const m=state.memories.find(x=>x.id===h.memId);if(!m)return;if(h.rating===rating)return;const previous=h.rating===1?.07:h.rating===-1?-.12:0;h.rating=rating;m.confidence=clamp((Number(m.confidence)||.5)+(rating===1?.07:-.12)-previous,.1,.99);learnAssociation();invalidateIndex();save();renderChat();toast(rating===1?'Avaliação positiva registrada.':'Avaliação negativa registrada. Você pode corrigir a memória.');}
 function openTeach(mem=null){editingId=mem?.id||null;$('teachTitle').textContent=mem?'Editar memória':'Ensinar o Synapse';$('teachSubject').value=mem?.subject||'';$('teachFact').value=mem?.fact||'';$('teachTags').value=mem?.tags?.join(', ')||'';$('teachAliases').value=mem?.aliases?.join('\n')||'';$('persistMemory').checked=mem?!!mem.approved:true;openOverlay('teachOverlay');$('teachSubject').focus();}
 function openMemories(){renderMemories();openOverlay('memOverlay');}
 function renderMemories(){const list=$('memoryList');list.replaceChildren();const filter=normal($('memorySearch').value);const visible=state.memories.filter(m=>!filter||normal([m.subject,m.fact,...(m.tags||[])].join(' ')).includes(filter));if(!visible.length){const msg=document.createElement('p');msg.className='empty';msg.textContent='Nenhuma memória cadastrada. Clique em “Nova memória” para começar.';list.appendChild(msg);return;}const note=document.createElement('p');note.className='context-help';note.textContent='Exibindo até '+Math.min(MEMORY_PAGE,visible.length)+' de '+visible.length+' memórias. Use a busca para filtrar.';list.appendChild(note);
  for(const m of visible.slice(-MEMORY_PAGE).reverse()){ 
  const row=document.createElement('div');row.className='memory-row';const body=document.createElement('div');body.className='memory-text';const title=document.createElement('strong');title.textContent=m.subject;const desc=document.createElement('p');desc.textContent=m.fact;const small=document.createElement('small');small.textContent=(m.approved?'Persistente':'Temporária')+' · Confiança '+Math.round((Number(m.confidence)||.5)*100)+'%'+' · '+(m.source||'local')+(m.tags?.length?' · '+m.tags.join(', '):'');body.append(title,desc,small);
  const tools=document.createElement('div');tools.style.display='flex';tools.style.gap='6px';tools.style.flexWrap='wrap';for(const [txt,func,kind] of [['Editar',()=>openTeach(m),''],['Excluir',()=>{if(confirm('Excluir esta memória?')){state.memories=state.memories.filter(x=>x.id!==m.id);
   state.deletedSubjects=[...new Set([...state.deletedSubjects,normal(m.subject)])];invalidateIndex();save();renderMemories();memoryCount();toast('Memória excluída.');}},'danger']]){const btn=document.createElement('button');btn.type='button';btn.className='button '+kind;btn.textContent=txt;btn.onclick=func;tools.appendChild(btn);}row.append(body,tools);list.appendChild(row);
 }}
 function exportData(){
  const payload={format:'thigas-synapse-memories',version:3,exported_at:new Date().toISOString(),memories:state.memories.map(({id,subject,fact,tags,aliases,approved,confidence,source,createdAt})=>({id,subject,fact,tags,aliases,approved,confidence,source,createdAt}))};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='thigas-synapse-memorias-v3.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('Exportação iniciada.');
 }
 function importData(payload){
  const arr=Array.isArray(payload)?payload:payload?.memories;
  if(!Array.isArray(arr))throw Error('JSON sem campo “memories”.');
  if(arr.length>MAX_MEMORY)throw Error('O arquivo excede '+MAX_MEMORY+' memórias.');
  let count=0;
  const seen=new Set(state.memories.map(x=>normal(x.subject)));
  for(const m of arr){
   if(!m||typeof m.subject!=='string'||typeof m.fact!=='string'||!m.subject.trim()||!m.fact.trim())continue;
   const key=normal(m.subject);
   if(seen.has(key))continue;
   if(state.memories.length>=MAX_MEMORY)break;
   editingId=null;
   addMemory({subject:m.subject,fact:m.fact,tags:Array.isArray(m.tags)?m.tags:[],aliases:Array.isArray(m.aliases)?m.aliases:[],approved:m.approved!==false,confidence:m.confidence,source:m.source||'importado'},null,true);
   seen.add(key);count++;
  }
  invalidateIndex();save();renderMemories();memoryCount();return count;
 }
 $('chatForm').addEventListener('submit',e=>{e.preventDefault();const ta=$('userInput');const text=ta.value;ta.value='';ta.style.height='auto';submitText(text);ta.focus();});
 $('userInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('chatForm').requestSubmit();}});
 $('userInput').addEventListener('input',e=>{const el=e.target;el.style.height='auto';el.style.height=Math.min(el.scrollHeight,170)+'px';});
 $('modeBtn').onclick=()=>{learning=!learning;$('modeBtn').setAttribute('aria-pressed',String(learning));$('modeBtn').textContent='Modo aprendizagem: '+(learning?'ativado':'desativado');};
 $('newBtn').onclick=()=>{if((state.history.length||state.memories.some(m=>!m.approved))&&!confirm('Limpar o histórico e as memórias temporárias? As memórias persistentes serão mantidas.'))return;state.history=[];state.memories=state.memories.filter(m=>m.approved);invalidateIndex();save();renderChat();closeMobile();$('userInput').focus();};
 $('teachBtn').onclick=()=>openTeach();$('quickTeach').onclick=()=>openTeach();$('memoriesBtn').onclick=()=>openMemories();$('memorySearch').addEventListener('input',renderMemories);$('newKnowledge').onclick=()=>openTeach();$('exportBtn').onclick=exportData;$('exportHere').onclick=exportData;$('importBtn').onclick=()=>{$('fileInput').value='';$('fileInput').click();closeMobile();};$('importHere').onclick=()=>{$('fileInput').value='';$('fileInput').click();};
 $('fileInput').onchange=async e=>{
  const files=Array.from(e.target.files||[]);if(!files.length)return;
  let added=0,errors=[];
  for(const file of files){
   if(file.size>3*1024*1024){errors.push(file.name+': maior que 3 MB');continue;}
   try{const payload=JSON.parse(await file.text());added+=importData(payload);}catch(err){errors.push(file.name+': '+err.message);}
  }
  renderChat();toast(added+' novas memórias importadas.'+(errors.length?' Erros: '+errors.join(' | ').slice(0,170):''));
 };
 $('teachForm').addEventListener('submit',e=>{e.preventDefault();try{const mem=addMemory({subject:$('teachSubject').value,fact:$('teachFact').value,tags:$('teachTags').value.split(','),aliases:$('teachAliases').value.split(/\n|;/),approved:$('persistMemory').checked});editingId=null;closeOverlays();renderMemories();toast('Conhecimento salvo: '+mem.subject);renderChat();}catch(err){toast(err.message);}});
 $('cancelTeach').onclick=()=>{editingId=null;closeOverlays();};$('closeTeach').onclick=()=>{editingId=null;closeOverlays();};$('closeMem').onclick=closeOverlays;
 for(const ov of ['teachOverlay','memOverlay'])$(ov).addEventListener('click',e=>{if(e.target===$(ov))closeOverlays();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeOverlays();closeMobile();}});
 $('menuBtn').onclick=()=>{$('sidebar').classList.toggle('mobile-open');};
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(SR){const btn=$('micBtn');btn.hidden=false;btn.onclick=()=>{if(listening&&recognize){recognize.stop();return;}try{recognize=new SR();recognize.lang='pt-BR';recognize.interimResults=false;recognize.maxAlternatives=1;recognize.onresult=e=>{const text=e.results?.[0]?.[0]?.transcript||'';$('userInput').value=($('userInput').value+' '+text).trim();$('userInput').dispatchEvent(new Event('input'));$('userInput').focus();};recognize.onerror=e=>toast('Microfone indisponível: '+(e.error||'permissão negada'));recognize.onend=()=>{listening=false;btn.textContent='Falar';};recognize.start();listening=true;btn.textContent='Parar';}catch(e){toast('Reconhecimento de voz indisponível neste contexto.');}};}
 if((!existed || migrated) && !loadError)save();
 renderChat();
 if(loadError){$('note').textContent='Dados anteriores ilegíveis — faça backup antes de salvar';toast('Armazenamento local danificado ou bloqueado; memórias de fábrica carregadas.');}

})();
