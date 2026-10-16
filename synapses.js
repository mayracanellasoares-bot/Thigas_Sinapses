/* Associações temáticas calculadas localmente; NÃO é uma rede neural treinada.
   Uma sinapse significa correlação de assunto/termos, não implicação causal. */
(function(root,make){const api=make();if(typeof module==='object'&&module.exports)module.exports=api;root.ThigasSynapses=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const NLP=()=>typeof ThigasNLP!=='undefined'?ThigasNLP:globalThis.ThigasNLP;
const generic=new Set(('programacao tecnologia linguagen linguagem ciencias ciencia exata humanas psicologia fundamentos conceito definicao desenvolvimento informacao aprendizagem dados aplicacao sistema processo metodo metodos tipo tipos estudo forma base geral digital mental web pesquisa cientifica conhecimento historico historia humana ferramenta exemplo principais significa utiliza usar usado ocorre envolve permite diferentes atraves entre como quando onde quem porque esse aquela palavras parte pode consiste conjunto determinado chamado chamada sao foi ser criar criado criada surgiu torna processo teoria conteudo pergunta resposta conhecimento memoria sinapse criador funciona funcao introducao importante analise abrange relacao diversas outras exercicio ciencias humanas naturais moderna modernas area areas').split(' '));
const wordSet=s=>new Set(NLP().tokens(s).filter(t=>t.length>=3&&!generic.has(t)));
const key=(a,b,n)=>a<b?a*n+b:b*n+a;
const domain=m=>{const s=(m.source||'').toLowerCase();
 if(/programacao|python|web_javascript|01_/.test(s))return 'programacao';
 if(/ciencias_humanas|historia_geografia|05_portugues|02_ciencias_humanas/.test(s))return 'humanas';
 if(/linguagens|03_linguagens/.test(s))return 'linguagens';
 if(/tecnologia|04_tecnologia/.test(s))return 'tecnologia';
 if(/psicologia|05_psicologia/.test(s))return 'psicologia';
 if(/ciencias_exatas|ciencias_e_matematica|04_ciencias_e_matematica|06_ciencias_exatas/.test(s))return 'exatas';
 if(/inteligencia_artificial|03_inteligencia/.test(s))return 'tecnologia';
 return 'livre';};
function build(memories,maxLinks=18){
 const n=memories.length,docs=memories.map((m,i)=>({i,m,sub:wordSet(m.subject),tags:wordSet((m.tags||[]).join(' ')),domain:domain(m),fact:NLP().normal(m.fact)}));
 const terms=new Map(); for(const d of docs){for(const t of new Set([...d.sub,...d.tags])){if(!terms.has(t))terms.set(t,[]);terms.get(t).push(d.i);}}
 const weights=new Map();function add(a,b,value){if(a===b)return;const k=key(a,b,n);weights.set(k,(weights.get(k)||0)+value);}
 for(const [t,ids] of terms){if(ids.length<2||ids.length>Math.min(80,Math.ceil(n*.12)))continue;
  const specificity=Math.min(2.2,Math.max(.6,Math.log(1+n/ids.length)/2.5));
  for(let x=0;x<ids.length;x++)for(let y=x+1;y<ids.length;y++){
   const a=docs[ids[x]],b=docs[ids[y]];
   if(a.domain!==b.domain && a.domain!=='livre' && b.domain!=='livre')continue;
   const bothSub=a.sub.has(t)&&b.sub.has(t),cross=(a.sub.has(t)&&b.tags.has(t))||(b.sub.has(t)&&a.tags.has(t));
   const strength=bothSub?2.5:cross?1.3:.7;
   add(a.i,b.i,strength*specificity);
  }
 }
 // Uma menção explícita a outro conceito cria vínculo forte, inclusive entre áreas.
 for(const d of docs){for(const term of d.sub){const ids=terms.get(term)||[];
   if(term.length<5||ids.length>32)continue;
   for(const j of ids){if(j===d.i)continue;
    const other=docs[j];if(!other.sub.has(term))continue;
    if(other.fact.includes(' '+term+' ')||other.fact.startsWith(term+' ')||other.fact.endsWith(' '+term))add(d.i,j,.7);
   }
 }}
 // Memórias vizinhas na mesma seção curricular também estão relacionadas.
 // Nunca trata uma associação temática como prova de equivalência factual.
 const chapters=new Map();
 for(const d of docs){const source=String(d.m.source||'');if(!source.startsWith('biblioteca-educativa-1000:'))continue;
  const category=String((d.m.tags||[])[1]||'');if(!category)continue;
  const chapter=d.domain+'|'+category;
  if(!chapters.has(chapter))chapters.set(chapter,[]);chapters.get(chapter).push(d.i);
 }
 for(const ids of chapters.values()){
  for(let k=0;k<ids.length;k++)for(let off=1;off<=6;off++){
   if(k+off>=ids.length)break;add(ids[k],ids[k+off],2.11+(7-off)*.002);
  }
 }
 const ranking=[...weights].filter(([,score])=>score>=2.05).sort((a,b)=>b[1]-a[1]);
 const adjacent=Array.from({length:n},()=>[]),edges=[];
 for(const [k,score] of ranking){const a=Math.floor(k/n),b=k%n;
   if(adjacent[a].length>=maxLinks||adjacent[b].length>=maxLinks)continue;
   const s=Number(score.toFixed(2));adjacent[a].push({i:b,score:s});adjacent[b].push({i:a,score:s});edges.push({a,b,score:s});
 }
 for(const list of adjacent)list.sort((a,b)=>b.score-a.score);
 return {adjacent,edges,total:edges.length,degree:adjacent.map(a=>a.length),related(i,max=5){return (adjacent[i]||[]).slice(0,max).map(({i:j,score})=>({memory:memories[j],score}));}};
}
return {build};
});
