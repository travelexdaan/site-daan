import type { StructureResolver } from 'sanity/structure';

const singleton = (S: any, id: string, type: string, title: string) =>
  S.listItem().title(title).id(id).child(S.document().schemaType(type).documentId(id).title(title));

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Conteúdo do site')
    .items([
      S.documentTypeListItem('product').title('Equipamentos'),
      S.documentTypeListItem('category').title('Linhas e subcategorias'),
      S.documentTypeListItem('specialty').title('Especialidades'),
      S.documentTypeListItem('brand').title('Marcas'),
      S.divider(),
      S.documentTypeListItem('post').title('Blog'),
      S.divider(),
      singleton(S, 'home', 'home', 'Página inicial'),
      singleton(S, 'sobre', 'page', 'Sobre nós'),
      singleton(S, 'posVenda', 'page', 'Pós-venda'),
      singleton(S, 'contato', 'page', 'Contato'),
      singleton(S, 'siteSettings', 'siteSettings', 'Dados da empresa'),
    ]);
