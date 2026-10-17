'use strict';
const assert=require('node:assert/strict');
const NLP=require('../nlp_engine.js');global.ThigasNLP=NLP;
const Graph=require('../synapses.js');
const data=require('../memorias/1127_memorias.json').memories;
assert.equal(data.length,1127);
const index=NLP.createIndex(data);
const cases=[
['Quem inventou a linguagem Python?','criador do Python'],
['Qual é o autor da linguagem Python?','criador do Python'],
['O que significa Python?','o que é Python'],
['O que é JavaScript?','o que é JavaScript'],
['O que é JS?','o que é JavaScript'],
['Qual é a capital brasileira?','capital do Brasil'],
['O que é fotossíntese?','fotossíntese'],
['O que é CSS?','o que é CSS'],
['Como usar async await em JS?','async await JavaScript'],
['Qual a diferença entre null e undefined?','null e undefined'],
['Quem foi Machado de Assis?','Machado de Assis'],
['O que são embeddings semânticos?','embedding semântico'],
['Quem criou Java?',null],
['Quem criou Kotlin?',null],
['O que é blablablaverso?',null],
['O que é algoritmo?','algoritmo'],
['O que é indução eletromagnética?','indução eletromagnética'],
['O que é segurança da informação?','segurança da informação'],
['Quando começou a Revolução Francesa?','Revolução Francesa'],
['Qual é a capital da França?',null],
['qual a capital da frança',null],
['Como funciona o laço for em C++?',null],
['como funciona o laço for em c++?',null],
['Qual a diferença entre Python e Java?',null],
['O que é transtorno bipolar?',null],
['Quem foi Machado de Assis?','Machado de Assis'],
['Qual a capital brasileira?','capital do Brasil'],
['Me explique o que é um algoritmo em detalhes','algoritmo'],
];
for(const [q,expected] of cases){
 const result=NLP.query(index,q).match?.memory.subject??null;
 if(q==='Quando começou a Revolução Francesa?'){
  assert.match(result||'',/^Revolução Francesa/);
 }else{assert.equal(result,expected,q+' => '+result);}
}
const g=Graph.build(data);
assert.equal(g.total,7010);
assert.equal(g.edges.length,g.total);
assert.equal(new Set(g.edges.map(e=>e.a+'|'+e.b)).size,g.total);
assert.ok(g.degree.every(x=>x>=0&&x<=18));
assert.ok(g.edges.every(e=>e.a!==e.b && e.score>0 && e.a>=0 && e.b<data.length));
for(const e of g.edges){assert.ok(g.adjacent[e.a].some(x=>x.i===e.b));assert.ok(g.adjacent[e.b].some(x=>x.i===e.a));}
const bigger=Graph.build([...data,{subject:'algoritmo de demonstração',fact:'Um algoritmo descreve passos ordenados.',tags:['programação','algoritmo'],aliases:[],source:'ensinado'}]);
assert.equal(bigger.adjacent.length,1128);
console.log('PASS: '+cases.length+' perguntas de referência; '+g.total+' sinapses únicas e bidirecionais; limite 18 por memória; atualização da rede após ensino.');
