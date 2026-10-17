# THIGAS Synapse v4 — PLN, memórias e rede de sinapses

Chatbot **100% estático**, em português, executado no navegador, com recuperação de conhecimentos e associações temáticas. O aplicativo inteiro, incluindo os dados iniciais, está incorporado ao **`index.html`**. Não exige servidor Python, Node.js, chave de API, banco de dados ou chamadas a serviços externos para responder por texto.

## Abrir e publicar

**Uso local:** faça download do `index.html` e abra-o no Chrome, Firefox ou Edge. O comportamento de armazenamento de dados ao abrir via `file://` varia entre navegadores; recomenda-se usar o mesmo navegador e exportar backups regularmente.

**GitHub Pages:**

1. Crie um repositório no GitHub (ou use um repositório existente).
2. Envie o conteúdo deste pacote para a raiz do branch `main`, mantendo `index.html` na raiz.
3. Acesse **Settings → Pages → Build and deployment**, escolha **Deploy from a branch**, selecione `main` e a pasta `/ (root)`, depois salve.
4. Acesse a URL exibida pelo GitHub Pages após o deploy. Se houver demora, consulte **Actions** para verificar a publicação.

O arquivo `index.html` funciona isoladamente; `README.md`, `memorias/` e `sinapses/` são documentação/backups e não precisam ser carregados pelo navegador.

> **Importante:** o armazenamento do `file://` é diferente do endereço público `github.io`. Para levar memórias personalizadas de um lugar ao outro, use **Exportar dados** no site antigo e **Importar memórias** no novo. O mesmo vale ao mudar de domínio ou limpar os dados do navegador.

## O que está incluído

- **1.127 memórias iniciais**, sendo 127 originais e 1.000 novas: 198 de programação, 158 de ciências humanas, 149 de linguagens, 161 de tecnologia, 161 de psicologia e 173 de ciências exatas.
- **7.010 sinapses temáticas** computadas a partir dessas memórias, sem links duplicados e sem laços de um assunto consigo mesmo; até 18 conexões por memória. Algumas memórias sem proximidade suficiente permanecem desconectadas, em vez de receber ligações artificiais.
- PLN heurístico com normalização de português, sinônimos selecionados, identificação de intenção, BM25, vetores textuais esparsos e detecção de ambiguidades. **Não utiliza embeddings neurais nem uma LLM generativa**.
- **Aprendizagem local**: memórias novas, edição, exclusão, importação e exportação em JSON.
- **Exploração de sinapses:** depois das respostas fundamentadas, botões com tópicos relacionados; as conexões são recalculadas ao alterar o banco.
- Interface adaptada a PC e celular; ditado pelo microfone quando o navegador oferece reconhecimento de fala e as permissões necessárias.

As conexões indicam **proximidade lexical ou pertencimento à mesma sequência temática didática**, não relações científicas verificadas nem novas afirmações produzidas pela IA. O valor `confidence` influencia o ranqueamento e **não é uma nota de confiabilidade factual**.

## Comandos do chat

| Comando | Função |
|---|---|
| `/sinapses` | Exibe quantas associações existem na biblioteca local |
| `/sinapses Python` | Mostra assuntos associados a uma memória correspondente |
| `/aprender assunto \| explicação` | Ensina uma informação persistente ao navegador |

É possível usar **Ensinar conhecimento** em vez do comando; esse formulário aceita tags e perguntas alternativas. Para restaurar conteúdo adicional, utilize **Importar memórias** com arquivos que tenham o campo `memories` (ou um array de memórias). Registros com o mesmo assunto são ignorados na importação para preservar edições locais.

## Arquivos do repositório

```text
index.html                         # Aplicativo inteiro (autônomo)
README.md                          # Este documento
memorias/1127_memorias.json        # Backup íntegro da base inicial
sinapses/7010_conexoes.json        # Rede de associações da base inicial (referência)
nlp_engine.js                      # Código-fonte independente do motor PLN
synapses.js                        # Código-fonte independente do motor de relações
browser.js                         # Código-fonte independente da interface
RELATORIO_AUDITORIA.md             # Verificações, correções e limitações
tests/                             # Testes reproduzíveis (não usados em produção)
```

Os scripts `.js` ficam disponíveis para auditoria e edição. **Não precisam ser importados pelo `index.html`**, pois o mesmo código já está incorporado nele. Se alterar esses scripts, atualize também o `index.html`; editar somente os arquivos `.js` não altera o site publicado.

O JSON de sinapses é apenas uma fotografia da base inicial. Ao ensinar, editar ou apagar memórias no navegador, as relações são recalculadas em memória, sem atualizar automaticamente os arquivos do repositório.

## Testar o código

Com Node.js instalado:

```bash
node --check browser.js
node --check nlp_engine.js
node --check synapses.js
node tests/test_engine.cjs
```

Com Python 3:

```bash
python tests/auditar_memorias.py
```

Para os testes automatizados de interface e migração, instale **Playwright para Python** e Chromium. Os scripts de navegador usados nesta auditoria esperam o Chromium em `/usr/bin/chromium`; em outro sistema, ajuste `executable_path` no teste.

```bash
python tests/test_browser.py
python tests/test_migration.py
```

## Armazenamento, privacidade e limitações

As conversas e o aprendizado ficam em `localStorage` no **próprio dispositivo e origem do site**. O navegador pode impor quotas ou apagar dados. Exporte um JSON de backup antes de atualizar, mudar de site ou limpar dados. O teto lógico foi ampliado para 5.000 memórias, mas a quantidade efetiva suportada depende do limite de armazenamento do navegador. Não há login, sincronização entre dispositivos ou criptografia das memórias locais.

A interface insere fatos com `textContent`, impedindo que HTML nas respostas seja executado; isso não transforma arquivos importados de procedência desconhecida em fontes verdadeiras. Evite dados sigilosos ou clínicos. As memórias de psicologia são **conteúdo educacional**, não diagnóstico profissional.

O reconhecimento de voz depende das APIs e políticas do navegador; em alguns navegadores ele exige conexão com servidores de reconhecimento e não funciona offline.

**Qualidade da base:** a auditoria validou formato, completude estrutural, duplicações, comandos e recuperação de exemplos. Uma definição duplicada foi diferenciada. **Não foi realizada conferência documental independente das 1.127 afirmações**; para fatos sensíveis ou usados em contexto escolar, confira fontes confiáveis antes da utilização.

## Segunda auditoria — regressões de PLN e consistência (16/10/2026)

A segunda varredura encontrou e corrigiu correspondências inadequadas entre entidades (França/Brasil, C++/Python e Python/Java), o comando de ajuda interceptando perguntas técnicas, duplicações de assuntos em `/aprender` e avaliações repetidas aumentando a confiança da mesma resposta. A abertura de uma conversa também passa a pedir confirmação quando houver memórias temporárias, mesmo sem mensagens no histórico.

Foram adicionados testes de regressão. Verificações realizadas localmente: **28 consultas de PLN**, **27 testes de interface**, testes de migração, verificação de sintaxe JS e integridade dos JSONs. As memórias de fábrica continuam em **1.127** e a rede em **7.010 conexões**. A seleção ficou intencionalmente mais conservadora e pode solicitar reformulações em perguntas ambíguas. Esses números não substituem validação de produção no GitHub Pages nem avaliação bibliográfica das respostas.
