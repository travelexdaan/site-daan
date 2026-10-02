import { defineArrayMember, defineField, defineType } from 'sanity';

const slug = (source = 'name') =>
  defineField({ name: 'slug', title: 'Endereço (URL)', type: 'slug', options: { source, maxLength: 96 }, validation: (r) => r.required(), description: 'Parte final do endereço da página. Gerado a partir do nome.' });

const richText = (name = 'body', title = 'Texto') =>
  defineField({
    name,
    title,
    type: 'array',
    of: [
      defineArrayMember({ type: 'block' }),
      defineArrayMember({ type: 'image', options: { hotspot: true }, fields: [{ name: 'alt', title: 'Descrição da imagem', type: 'string' }] }),
    ],
  });

const order = defineField({ name: 'order', title: 'Ordem de exibição', type: 'number', description: 'Números menores aparecem primeiro.' });

export const product = defineType({
  name: 'product',
  title: 'Equipamento',
  type: 'document',
  groups: [
    { name: 'main', title: 'Principal', default: true },
    { name: 'content', title: 'Conteúdo' },
    { name: 'media', title: 'Fotos e arquivos' },
  ],
  fields: [
    defineField({ name: 'name', title: 'Nome', type: 'string', validation: (r) => r.required(), group: 'main' }),
    { ...slug(), group: 'main' },
    defineField({ name: 'brand', title: 'Marca', type: 'reference', to: [{ type: 'brand' }], validation: (r) => r.required(), group: 'main' }),
    defineField({ name: 'category', title: 'Linha / subcategoria', type: 'reference', to: [{ type: 'category' }], validation: (r) => r.required(), group: 'main', description: 'Ex.: Ultrassom › Estacionários' }),
    defineField({ name: 'specialties', title: 'Especialidades', type: 'array', of: [{ type: 'reference', to: [{ type: 'specialty' }] }], group: 'main' }),
    defineField({ name: 'summary', title: 'Resumo (1 frase)', type: 'text', rows: 2, validation: (r) => r.max(220), group: 'main', description: 'Aparece nos cards e no Google.' }),
    { ...order, group: 'main' },
    defineField({ name: 'description', title: 'Descrição', type: 'array', of: [{ type: 'text', rows: 4 }], group: 'content', description: 'Um item por parágrafo.' }),
    defineField({ name: 'highlights', title: 'Destaques', type: 'array', of: [{ type: 'string' }], group: 'content' }),
    defineField({
      name: 'specs',
      title: 'Especificações',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'specGroup',
          title: 'Grupo',
          fields: [
            { name: 'group', title: 'Título do grupo', type: 'string' },
            { name: 'items', title: 'Itens', type: 'array', of: [{ type: 'string' }] },
          ],
          preview: { select: { title: 'group' } },
        }),
      ],
    }),
    defineField({ name: 'images', title: 'Fotos', type: 'array', of: [{ type: 'image', options: { hotspot: true } }], group: 'media', description: 'A primeira foto é a principal.', options: { layout: 'grid' } }),
    defineField({ name: 'catalogPdf', title: 'Catálogo (PDF)', type: 'file', options: { accept: 'application/pdf' }, group: 'media' }),
  ],
  orderings: [{ title: 'Ordem', name: 'order', by: [{ field: 'order', direction: 'asc' }, { field: 'name', direction: 'asc' }] }],
  preview: { select: { title: 'name', subtitle: 'category.name', media: 'images.0' } },
});

export const category = defineType({
  name: 'category',
  title: 'Linha / subcategoria',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Nome', type: 'string', validation: (r) => r.required() }),
    slug(),
    defineField({ name: 'parent', title: 'Linha principal', type: 'reference', to: [{ type: 'category' }], description: 'Preencha só para subcategorias (ex.: Estacionários dentro de Ultrassom).' }),
    defineField({ name: 'intro', title: 'Texto de apresentação', type: 'text', rows: 4 }),
    order,
  ],
  preview: { select: { title: 'name', subtitle: 'parent.name' } },
});

export const specialty = defineType({
  name: 'specialty',
  title: 'Especialidade',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Nome', type: 'string', validation: (r) => r.required() }),
    slug(),
    defineField({ name: 'intro', title: 'Texto', type: 'text', rows: 8, description: 'Separe parágrafos com uma linha em branco.' }),
    defineField({ name: 'image', title: 'Imagem', type: 'image', options: { hotspot: true } }),
  ],
  preview: { select: { title: 'name', media: 'image' } },
});

export const brand = defineType({
  name: 'brand',
  title: 'Marca',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Nome', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'logo', title: 'Logo', type: 'image' }),
  ],
});

export const post = defineType({
  name: 'post',
  title: 'Post do blog',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Título', type: 'string', validation: (r) => r.required() }),
    slug('title'),
    defineField({ name: 'date', title: 'Data', type: 'date', initialValue: () => new Date().toISOString().slice(0, 10), validation: (r) => r.required() }),
    defineField({ name: 'coverImage', title: 'Imagem de capa', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'excerpt', title: 'Resumo', type: 'text', rows: 3 }),
    richText(),
  ],
  orderings: [{ title: 'Mais recentes', name: 'dateDesc', by: [{ field: 'date', direction: 'desc' }] }],
  preview: { select: { title: 'title', subtitle: 'date', media: 'coverImage' } },
});

export const page = defineType({
  name: 'page',
  title: 'Página',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Título', type: 'string' }),
    richText(),
    defineField({ name: 'images', title: 'Imagens', type: 'array', of: [{ type: 'image', options: { hotspot: true } }] }),
  ],
});

export const home = defineType({
  name: 'home',
  title: 'Página inicial',
  type: 'document',
  fields: [
    defineField({ name: 'heroTitle', title: 'Título principal', type: 'string' }),
    defineField({ name: 'heroSubtitle', title: 'Subtítulo', type: 'text', rows: 2 }),
    defineField({ name: 'heroImages', title: 'Imagem do topo', type: 'array', of: [{ type: 'image', options: { hotspot: true } }] }),
    defineField({ name: 'aboutText', title: 'Texto "Sobre a Daan"', type: 'text', rows: 4 }),
    defineField({ name: 'highlights', title: 'Diferenciais', type: 'array', of: [{ type: 'string' }] }),
  ],
});

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Dados da empresa',
  type: 'document',
  fields: [
    defineField({ name: 'logo', title: 'Logo', type: 'image' }),
    defineField({ name: 'phone', title: 'Telefone', type: 'string' }),
    defineField({ name: 'mobile', title: 'Celular', type: 'string' }),
    defineField({ name: 'whatsapp', title: 'WhatsApp (só números, com 55 e DDD)', type: 'string', validation: (r) => r.regex(/^\d{12,13}$/) }),
    defineField({ name: 'email', title: 'E-mail', type: 'string' }),
    defineField({ name: 'address', title: 'Endereço', type: 'string' }),
    defineField({ name: 'hours', title: 'Horário de atendimento', type: 'string' }),
    defineField({ name: 'instagram', title: 'Instagram (link)', type: 'url' }),
    defineField({ name: 'linkedin', title: 'LinkedIn (link)', type: 'url' }),
    defineField({ name: 'gtm', title: 'Google Tag Manager (ID)', type: 'string' }),
    defineField({
      name: 'partners',
      title: 'Marcas representadas (logos do topo)',
      type: 'array',
      of: [defineArrayMember({ type: 'object', fields: [{ name: 'name', title: 'Nome', type: 'string' }, { name: 'logo', title: 'Logo', type: 'image' }] })],
    }),
  ],
});

export const schemaTypes = [product, category, specialty, brand, post, page, home, siteSettings];
export const singletonTypes = new Set(['home', 'siteSettings', 'page']);
