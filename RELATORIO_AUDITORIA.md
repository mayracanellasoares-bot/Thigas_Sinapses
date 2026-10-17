# Relatório técnico de auditoria — THIGAS Synapse v4

Data: 16/10/2026. Escopo: base original de 127 memórias + biblioteca de 1.000 memórias, motor PLN, associações e interface estática para GitHub Pages.

## Falhas encontradas e correções

1. **Comandos `/aprender` não reconhecidos:** a normalização removia a barra antes da comparação. Os comandos `/aprender`, `/sinapses` e `/sinapses assunto` passaram a usar a entrada original.
2. **Pesos sinápticos sem aplicação efetiva na consulta:** em vez de armazenar milhares de pares de palavras com pouco uso, foi criada uma rede temática verificável, calculada a partir das memórias e navegável pelo chat.
3. **Ambiguidade mesmo com assunto exato:** adicionado reconhecimento de assunto e perguntas alternativas exatas, mantendo recusa para consultas inseguras ou não identificadas.
4. **Baixo teto de memórias (1.200):** teto lógico alterado para 5.000, sem prometer superar a quota do `localStorage` do navegador.
5. **Duplicação na base:** `tokenização em PLN` e `tokenização em IA` tinham texto de resposta idêntico. A segunda foi especificada para contexto de modelos generativos, preservando 1.127 assuntos.
6. **Risco de substituição das memórias salvas na atualização:** migração adiciona a nova biblioteca, preservando versões locais de assuntos existentes. Exclusões em v4 são registradas, impedindo reaparecimento das memórias apagadas. Exclusões antigas da v3 são respeitadas na migração.
7. **Muitas linhas renderizadas na biblioteca:** exibição visual limitada a 140 memórias por vez com filtro, sem excluir dados.
8. **Falta de limite para texto enviado e erro inesperado sem resposta:** mensagem limitada a 4.000 caracteres e exceções mostradas no chat.
9. **Dados antigos malformados:** validação e saneamento de arrays de tags e aliases antes de reconstruir o índice.
10. **Definição de sinapse potencialmente enganosa:** o texto e a documentação agora deixam explícito que conexões heurísticas não são neurônios artificiais treinados ou inferências factuais.

## Verificações realizadas

- **Memórias:** 1.127 itens, assuntos distintos, respostas não repetidas, campos esperados, tags e aliases válidos.
- **Rede:** 7.010 arestas bidirecionais únicas sem autoconexões e limite de 18 relações por memória. Memórias sem associação suficientemente forte são deixadas isoladas.
- **Sintaxe:** checagem de JavaScript com Node.js.
- **Consulta:** 19 verificações de PLN com respostas, reformulações e recusa de entidade fora da base.
- **Navegador:** 22 testes de interface envolvendo comunicação, ensino, busca, sinapses, armazenamento simulado, importação, XSS e responsividade.
- **Migração:** validação automatizada de dados da v3 para v4 e persistência de exclusões no recarregamento.

## Limites da auditoria

- Não houve validação individual das 1.127 definições por pesquisa bibliográfica externa.
- As sinapses são associações lexicais/temáticas; conexões podem ter utilidade pedagógica diferente em cada assunto.
- O navegador desta bancada bloqueou navegação direta para `file://` e servidores `localhost`; os testes de tela foram executados com o HTML carregado no Chromium por `set_content`, incluindo simulação de persistência. Não constitui validação do deploy remoto do GitHub Pages.
- O reconhecimento de voz depende de permissões e implementação de cada navegador; não foi validado com hardware/microfone real.

## Segunda varredura e correções adicionais (16/10/2026)

- **Alta prioridade — falso positivo em PLN:** consultas sobre capital da França retornavam a memória da capital do Brasil; comparações Python/Java e perguntas C++/Python tinham candidatos indevidos. O filtro agora exige cobertura dos termos essenciais e impede trocas de entidades próprias explicitadas no enunciado. Casos de teste positivos e negativos acrescentados.
- **Média — ajuda acionada indevidamente:** o padrão de `Como funciona...` interceptava perguntas sobre funcionalidades técnicas. Restringido a consultas específicas sobre o Synapse.
- **Média — duplicação de conhecimento:** criação ou renomeação com assunto idêntico podia produzir memórias conflitantes. A operação agora bloqueia duplicatas e informa como editar o registro existente.
- **Baixa — pontuação acumulada indevidamente:** votar repetidamente na mesma resposta inflava ou reduzia a confiança; votos idênticos passam a ser idempotentes, e a troca de voto desconta o ajuste anterior.
- **Baixa — perda potencial de memória temporária:** a opção Nova conversa agora pede confirmação mesmo com histórico vazio quando existirem memórias não persistentes.

**Validação realizada nesta segunda rodada:** Node `--check`, **28/28** cenários de consulta, **27/27** testes de interface no Chromium, teste de migração e auditoria estrutural de **1.127** memórias e **7.010** sinapses. Sem avaliação individual de veracidade dos fatos. A execução do deploy remoto e o microfone físico não foram testados nesta rodada.
