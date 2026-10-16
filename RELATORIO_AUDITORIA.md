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
