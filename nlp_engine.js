/* THIGAS Synapse NLP Lite v3
 * Busca híbrida heurística: conceitos equivalentes + BM25 lexical + vetores
 * de características esparsas + similaridade de trigramas. Sem modelo neural.
 * API pura para uso offline e testes. Licença MIT.
 */
(function (root, make) {
  const api = make();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ThigasNLP = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const normal = value => String(value ?? '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9+#.\s-]/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const skip = new Set(('a o os as um uma uns umas de da do dos das e em para por com ao aos na no nos nas ' +
    'que qual quais sao me meu minha meus minhas seu sua seus suas isto isso esse essa este esta ' +
    'voce voces favor gostaria poderia diga informe preciso quero saber explicar explique ' +
    'sobre pra tambem exemplo me conte mostre detalhe detalhes').split(' '));
  const concepts = [
    ['criador','inventor','inventou','criou','criada','criado','desenvolvedor','desenvolveu','autor','autoria','fundador','idealizador'],
    ['definicao','defina','significa','significado','conceito','consiste'],
    ['funcao','funcionamento','funciona','serve','utilidade'],
    ['linguagem','idioma'],
    ['codigo','codificacao','codificar'],
    ['programar','programacao','programador','programadores'],
    ['erro','bug','falha','problema'],
    ['biblioteca','lib','pacote','packages'],
    ['inteligencia','ia'],
    ['artificial','computacional'],
    ['aplicativo','app','aplicacao'],
    ['site','pagina','website'],
    ['internet','web'],
    ['aprendizado','aprendizagem','machinelearning'],
    ['memoria','memorias','lembranca'],
    ['sinonimo','sinonimos','semelhante'],
    ['antonimo','antonimos','oposto'],
    ['resposta','resultado'],
    ['calcular','calculo','conta'],
    ['celular','smartphone','mobile'],
    ['armazenar','salvar','guardar'],
    ['javascript','js','ecmascript'],
    ['python','py'],
    ['nodejs','node'],
    ['pln','nlp'],
    ['embedding','embeddings','vetorizacao'],
    ['quantizacao','quantizar'],
    ['seguranca','protecao'],
    ['assincrono','assincrona','async'],
    ['diferenca','diferencas','comparacao','comparar'],
    ['criacao','construcao','produzir','construir'],
    ['brasileira','brasileiro','brasil'],
    ['geo','geografia'],
    ['historia','historico'],
    ['portugues','gramatica'],
    ['neural','neurais','neuronios'],
    ['bot','chatbot','assistente']
  ];
  const aliasMap = new Map();
  for (const family of concepts) for (const value of family) aliasMap.set(value, family[0]);
  // Mantém termos técnicos como tokens distintos, sem tentar tratar Java como JavaScript.
  function tokens(s) {
    return normal(s).replace(/\bnode\.js\b/g, ' nodejs ').replace(/\bc\+\+\b/g, ' cpp ')
      .split(/\s+/).filter(Boolean).map(w => w.replace(/^[-.]+|[-.]+$/g, ''))
      .filter(w => w.length > 1 && !skip.has(w))
      .map(w => aliasMap.get(w) || stem(w)).filter(Boolean).slice(0,100);
  }
  function stem(w) {
    if (w.length < 6 || /\d/.test(w) || w.includes('.')) return w;
    // Plural regular e flexão básica: não é um lematizador morfológico completo.
    if (w.endsWith('oes')) return w.slice(0, -3) + 'ao';
    if (w.endsWith('ais')) return w.slice(0, -3) + 'al';
    if (w.endsWith('res')) return w.slice(0, -1);
    if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
    return w;
  }
  function intent(text) {
    const s = normal(text);
    if (/\b(quem (criou|inventou|desenvolveu)|(?:qual|quem).*\b(criador|autor|inventor|fundador))\b/.test(s) || /\b(criador|autoria|inventor)\b/.test(s)) return 'autor';
    if (/\b(quantos?|quantas?|quanto custa|valor de|medida de)\b/.test(s)) return 'quantidade';
    if (/\b(qual a diferenca|diferenca entre|comparar|compare|versus|\bvs\b)\b/.test(s)) return 'comparacao';
    if (/\b(quando|em que ano|qual data|que dia)\b/.test(s)) return 'quando';
    if (/\b(onde|em que lugar|localizacao|capital (de|do|da))\b/.test(s)) return 'onde';
    if (/\b(por que|porque|motivo|razao)\b/.test(s)) return 'por_que';
    if (/\b(como (fazer|criar|instalar|usar|configurar|resolver|corrigir|declarar|abrir|ler|construir)|passo a passo)\b/.test(s)) return 'procedimento';
    if (/\b(quem e|quem foi)\b/.test(s)) return 'identidade';
    if (/\b(o que e|o que sao|defina|definicao|qual o significado|o que significa|explique|para que serve)\b/.test(s)) return 'definicao';
    return 'geral';
  }
  function featureVector(text) {
    const v = new Map();
    for (const t of tokens(text)) {
      v.set('w:' + t, (v.get('w:' + t) || 0) + 1);
      // Trigramas são características de superfície, NÃO embeddings neurais.
      if (t.length > 4) for (let i = 0; i + 3 <= t.length; i++) {
        const key = 'g:' + t.slice(i, i + 3);
        v.set(key, (v.get(key) || 0) + .13);
      }
    }
    return v;
  }
  function cosine(a, b) {
    if (!a.size || !b.size) return 0;
    let dot = 0, a2 = 0, b2 = 0;
    for (const n of a.values()) a2 += n * n;
    for (const n of b.values()) b2 += n * n;
    for (const [k, n] of a) dot += n * (b.get(k) || 0);
    return dot / Math.sqrt(a2 * b2);
  }
  function createIndex(memories) {
    const docs = memories.map(memory => {
      const labels = [memory.subject, ...(memory.aliases || [])].filter(Boolean);
      const st = new Set(tokens(labels.join(' ')));
      const tag = new Set(tokens((memory.tags || []).join(' ')));
      const answer = new Set(tokens(memory.fact));
      // Condensa as duplicações nas diferentes formulações equivalentes.
      const tf = new Map();
      for (const term of [...st, ...tag]) tf.set(term, (tf.get(term) || 0) + (st.has(term) ? 2 : .75));
      return {memory, st, tag, answer, tf, len:Math.max(1,tf.size), labels, labelVectors: labels.map(featureVector),
        detectedIntent: intent(memory.subject)};
    });
    const df = new Map(), average = docs.reduce((a,d)=>a+d.len,0)/Math.max(1,docs.length);
    for (const d of docs) for (const term of d.tf.keys()) df.set(term,(df.get(term)||0)+1);
    return {docs,df,average};
  }
  function query(index, question, opts={}) {
    const qtokens = [...new Set(tokens(question))];
    const qi = intent(question);
    if (!qtokens.length) return {match:null, alternatives:[],reason:'vazio'};
    const qv = featureVector(question), N = index.docs.length;
    const structural = new Set(['criador','definicao','funcao','quando','onde','como','quem','qual','quais','quantos','quantas','diferenca','comparacao','detalhe','detalhes','significa','ser','foi','fazer','usar','explicar','ano','data','nome']);
    const contentTerms = qtokens.filter(t => !structural.has(t));
    // Destaca entidades explícitas sem confundir palavras interrogativas com nomes.
    const questionStarts = new Set(['quem','qual','quais','como','quando','onde','oque','o','a','os','as','por','me','voce','explique','diga','quero','para','em','no','na','que']);
    const namedTerms = [...new Set((String(question).match(/[\p{Lu}][\p{L}\p{N}+#.]*/gu) || [])
      .flatMap(word => questionStarts.has(normal(word)) ? [] : tokens(word)))];
    const results = [];
    for (const d of index.docs) {
      let bm=0, overlap=0, importantOverlap=0, answered=0;
      for (const t of qtokens) {
        const f=d.tf.get(t)||0;
        if (f) {
          overlap++;
          if (d.st.has(t)) importantOverlap++;
          const df=index.df.get(t)||0, idf=Math.log(1+(N-df+.5)/(df+.5));
          bm+=idf*(f*2.2)/(f+1.2*(.25+.75*d.len/Math.max(1,index.average)));
        } else if (d.answer.has(t)) answered++;
      }
      if (!importantOverlap) continue;
      // Recusa respostas sobre entidades desconhecidas, como "Java" numa
      // coleção que só conhece o criador de "Python".
      if (contentTerms.length && !contentTerms.some(t => d.st.has(t) || d.tag.has(t))) continue;
      // Não responda com uma entidade errada (França ≠ Brasil, C++ ≠ Python).
      // Perguntas curtas precisam cobrir TODOS os termos do assunto; nas longas,
      // aceite alguma flexibilidade, mas não nomes próprios incompatíveis.
      const matchedContent = contentTerms.filter(t => d.st.has(t) || d.tag.has(t)).length;
      if (contentTerms.length >= 2 && matchedContent / contentTerms.length < .75) continue;
      if (contentTerms.length >= 2 && contentTerms.length <= 3 && matchedContent !== contentTerms.length) continue;
      if (namedTerms.some(t => !d.st.has(t) && !d.tag.has(t))) continue;
      const coverage=overlap/qtokens.length;
      const similar=d.labelVectors.reduce((m,v)=>Math.max(m,cosine(qv,v)),0);
      const ms=d.detectedIntent;
      // Perguntas de tipos incompatíveis não devem recuperar respostas apenas pela entidade.
      const specific=new Set(['autor','quantidade','comparacao','quando','onde','por_que','identidade']);
      if ((specific.has(qi) && ms !== qi && ms !== 'geral') || (specific.has(ms) && qi !== ms && qi !== 'geral')) continue;
      // A menção a uma entidade isolada não resolve a ambiguidade de vários fatos sobre ela.
      let score= bm*.55 + similar*5 + coverage*3.2 + Math.min(answered,2)*.08;
      if (ms===qi && qi!=='geral') score+=1.7;
      if (ms==='geral' || qi==='geral') score+=.1;
      score *= .85+.15*Math.min(1,Math.max(.1,Number(d.memory.confidence)||.8));
      results.push({memory:d.memory,score,coverage,similar,intent:ms,overlap,importantOverlap});
    }
    results.sort((a,b)=>b.score-a.score);
    const best=results[0], runner=results[1];
    const rawQuestion=normal(question);
    const topic=rawQuestion.replace(/^(?:o que (?:e|sao)|o que significa|qual o significado de|defina|explique|para que serve)\s+/, '').replace(/^(?:o|a|os|as)\s+/, '');
    const exact=results.find(r => (normal(r.memory.subject)===topic ||
      (r.memory.aliases||[]).some(alias=>normal(alias)===rawQuestion)) && r.score>=(opts.minScore??2.9) && r.similar>=.16);
    if (exact) return {match:exact,alternatives:results.filter(r=>r!==exact).slice(0,3),reason:'exato'};

    if (!best || best.score<(opts.minScore??2.9) || best.coverage<(qtokens.length<=2?.48:.37) || best.similar<.16)
      return {match:null,alternatives:results.slice(0,3),reason:'fraco'};
    const close = runner && runner.score>best.score*.88 && Math.abs(best.score-runner.score)<1.4;
    if (close && (qtokens.length <= 2 || best.coverage<.79))
      return {match:null,alternatives:results.slice(0,3),reason:'ambiguo'};
    return {match:best,alternatives:results.slice(1,3),reason:'ok'};
  }
  return {normal,tokens,intent,featureVector,cosine,createIndex,query};
});
