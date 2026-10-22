# Site Daan Imagem

Novo site da Daan Imagem (daanimagem.com.br), feito em **Astro** com conteúdo editável no **Sanity**.

- `src/` é o site (páginas, layout e estilos).
- `studio/` é o painel de edição (Sanity Studio).
- `src/data/*.json` guarda o conteúdo migrado do WordPress. O site usa esses arquivos enquanto o Sanity não estiver configurado.
- `scripts/seed-to-ndjson.mjs` converte esse conteúdo para importar no Sanity, com as fotos.

## Páginas

| Endereço | Conteúdo |
|---|---|
| `/` | Início: linhas de equipamentos, destaques, sobre, especialidades, blog |
| `/equipamentos/` | Catálogo com filtro por linha, marca e especialidade |
| `/equipamentos/<linha>/[<sub>/]` | Página da linha ou subcategoria (mesmos endereços do site antigo) |
| `/equipamentos/<linha>/[<sub>/]<produto>/` | Produto: galeria, destaques, especificações, formulário de cotação, relacionados |
| `/especialidades/` e `/especialidades/<slug>/` | Especialidades e os equipamentos indicados |
| `/marcas/` e `/marcas/<marca>/` | Philips, Konica Minolta, Guerbet e Carestream |
| `/pos-venda/` | Pós-venda com formulário de chamado |
| `/sobre-nos/`, `/contato/`, `/blog/`, `/privacidade/` | Institucionais |

Os endereços de equipamentos e especialidades continuam iguais aos do WordPress. Os posts do blog passam de `/<post>/` para `/blog/<post>/`, com redirecionamento 301 no arquivo `_redirects`.

## Rodar localmente

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # gera dist/
```

## Ligar o Sanity (uma vez)

1. Crie um projeto grátis em https://www.sanity.io/manage e anote o **Project ID**.
2. No projeto Sanity, em *API › CORS origins*, adicione `http://localhost:3333` e o domínio do painel.
3. Importe o conteúdo do site antigo (essa etapa baixa as fotos do WordPress, então rode antes de desligá-lo):
   ```bash
   cd studio && npm install
   export SANITY_STUDIO_PROJECT_ID=<project id>
   npx sanity login
   node ../scripts/seed-to-ndjson.mjs
   npx sanity dataset import ../seed.ndjson production --replace
   npx sanity deploy      # publica o painel em https://daanimagem.sanity.studio
   ```
4. Na hospedagem do site, defina a variável `SANITY_PROJECT_ID=<project id>`.
5. Crie um *Deploy hook* na hospedagem e cadastre-o no Sanity (*API › Webhooks*) para o site se atualizar sozinho quando alguém publicar algo no painel.

## Hospedagem (padrão: Netlify)

`netlify.toml` já está pronto. Conecte o repositório na Netlify, que vai rodar `npm run build` e publicar `dist/`. Os formulários de cotação e pós-venda usam **Netlify Forms**: as mensagens aparecem no painel da Netlify, que pode encaminhá-las por e-mail.

## Como editar (para a equipe)

Entre no painel, abra a seção desejada, altere e clique em **Publish**. O site é atualizado em cerca de 1 minuto.

- **Novo equipamento:** *Equipamentos › +*. Preencha nome, marca, linha, resumo e fotos (a primeira foto é a principal).
- **Novo post:** *Blog › +*.
- **Telefone, e-mail, endereço, WhatsApp:** *Dados da empresa*.
- **Textos da home, Sobre, Pós-venda:** nas páginas únicas no fim do menu.

## Pendências de conteúdo herdadas do site antigo

- **Azurion 3:** os destaques são do Incisive CT (iDose4, O-MAR, Tube for Life).
- **Azurion 7:** o texto diz "Azurion 5 com detector plano de 12 polegadas".
- **EPIQ Elite:** a foto principal é a do EPIQ CVx.
- **Affiniti 30 e 50:** têm a mesma galeria.
- **Zenition 70:** a última foto é de uma ressonância Ingenia.
- **Ingenia Elition:** o texto chama o equipamento de "Ingenia 1.5T Evolution".
- **Lumify:** algumas linhas de especificação estão cortadas.
- **DRX e Impressora DryView:** cada página reúne vários modelos e pode ser dividida.
- **Posts do blog:** todos estão com a data de 03/06/2024, que parece ser a data da migração.
- **E-mail:** o site antigo mostra comercial@ e comercial1@. O novo usa comercial@.
- **Radiologia:** não tem equipamentos vinculados.
- **Carestream:** só as impressoras DryView e os filmes continuam no site. Os outros 8 itens Carestream estão com *Ocultar do site* marcado.
- **Konica Minolta e Guerbet:** as linhas (Raio-X, Raio-X portátil, Mamografia, Placas detectoras, Placas veterinárias, Injetoras e Meios de contraste) estão criadas e mostram "sob consulta" até receberem produtos pelo painel. Xenetix e Optiray já estão cadastrados, mas ainda sem fotos.
