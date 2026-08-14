# QR Livre

Gerador de QR estático, gratuito e de código aberto. Funciona inteiramente no
navegador: não usa backend, banco de dados, conta, analytics, CDN nem
redirecionador. O projeto não transmite o conteúdo digitado.

## Usar o site

Abra `index.html` diretamente no navegador ou sirva a pasta localmente:

```bash
python3 -m http.server 8000
```

Depois, acesse `http://localhost:8000`.

Não há etapa de build. As bibliotecas necessárias estão na pasta `vendor/`, e
uma política de segurança no próprio HTML bloqueia conexões de rede iniciadas
pela página.

## QR estático não expira

O QR gerado contém diretamente o texto ou URL informado. Ele não contém um
link intermediário deste projeto, por isso não depende da continuidade do site
nem de uma assinatura. Se o conteúdo for uma URL, naturalmente o endereço de
destino ainda precisa continuar disponível.

Um QR dinâmico funciona de outra forma: contém o endereço de um redirecionador,
o que permite trocar o destino e contar acessos, mas cria dependência do
serviço que mantém esse redirecionamento. Este projeto gera apenas QR estático.

Antes de imprimir muitas cópias, teste o arquivo final com mais de um leitor no
tamanho em que ele será usado.

## Privacidade

O código da aplicação não faz requisições de rede, não armazena o conteúdo e
não inclui scripts de terceiros. Hospedar o projeto no GitHub Pages não muda o
processamento local do conteúdo, mas o GitHub ainda registra dados normais de
acesso à página, incluindo o IP do visitante, por motivos de segurança, como
explica a [documentação do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection).

Como em qualquer página, o navegador, suas extensões e o sistema operacional
estão fora do controle deste projeto.

## Publicar gratuitamente no GitHub Pages

1. Crie um repositório público no GitHub.
2. Envie estes arquivos para a branch `main`.
3. Abra **Settings → Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Selecione a branch `main`, a pasta `/ (root)` e salve.

No plano GitHub Free, o Pages está disponível para repositórios públicos. O
site é estático e não requer servidor próprio.

## Usar o script Python

O script de linha de comando é opcional. Instale a dependência:

```bash
python3 -m pip install -r requirements.txt
```

Gere PNG e SVG a partir de um exemplo neutro:

```bash
python3 gerar_qr.py "https://example.com" -o exemplo
```

Arquivos criados: `exemplo.png` e `exemplo.svg`.

## Testes

Os testes não instalam dependências e usam o executor nativo do Node.js:

```bash
npm test
```

Eles verificam geração nos quatro níveis de correção, codificação UTF-8 e
ausência das APIs de rede e armazenamento mais comuns no código da aplicação.

## Estrutura

- `index.html`: interface e política de segurança do site.
- `app.js`: geração e download no navegador.
- `styles.css`: aparência responsiva.
- `vendor/`: biblioteca JavaScript incorporada ao projeto.
- `gerar_qr.py`: alternativa opcional de linha de comando.
- `licenses/`: licença da biblioteca incorporada.
- `tests/`: verificações automatizadas.

## Licenças e marca

O código deste projeto é distribuído sob a licença MIT; consulte `LICENSE`.

A biblioteca incorporada
[`qrcode-generator`](https://github.com/kazuhikoarase/qrcode-generator), de
Kazuhiko Arase, também usa a licença MIT. A versão e a origem dos arquivos estão
documentadas em `vendor/README.md`, e a licença preservada está em
`licenses/qrcode-generator-MIT.txt`.

O script opcional usa
[`python-qrcode`](https://github.com/lincolnloop/python-qrcode), distribuído sob
licença BSD de 3 cláusulas e instalado separadamente pelo usuário.

Segundo a [FAQ oficial da DENSO WAVE](https://www.qrcode.com/en/faq.html), o
padrão pode ser usado sem taxa ou contrato de licença, inclusive
comercialmente, desde que os padrões JIS/ISO sejam seguidos. A expressão “QR
Code” é marca registrada da DENSO WAVE INCORPORATED; a marca não se aplica à
imagem gerada.
