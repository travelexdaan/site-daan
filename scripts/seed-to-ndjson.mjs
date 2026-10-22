// Converte o conteúdo migrado (src/data/*.json) para o formato de importação do Sanity (seed.ndjson).
// As imagens são baixadas do site antigo e enviadas ao Sanity durante o `sanity dataset import`.
// Uso: node scripts/seed-to-ndjson.mjs && cd studio && npx sanity dataset import ../seed.ndjson production --replace
import fs from 'node:fs';
import { marked } from 'marked';

const read = (f) => JSON.parse(fs.readFileSync(new URL(`../src/data/${f}`, import.meta.url), 'utf8'));
const products = read('products.json');
const categories = read('categories.json');
const specialties = read('specialties.json');
const posts = read('posts.json');
const pages = read('pages.json');
const brandSeed = read('brands.json');

let k = 0;
const key = () => `k${(k++).toString(36)}`;
const ref = (id) => ({ _type: 'reference', _ref: id });
const img = (url) => (url ? { _type: 'image', _sanityAsset: `image@${url}` } : undefined);
const imgItem = (url) => ({ _key: key(), ...img(url) });
const catId = (c) => (c.parent ? `category-${c.parent}-${c.slug}` : `category-${c.slug}`);
const slug = (s) => ({ _type: 'slug', current: s });

// Markdown -> Portable Text (títulos, parágrafos, listas e imagens; negrito e links viram texto/marcas simples)
function inline(tokens = []) {
  const spans = [];
  const markDefs = [];
  const walk = (ts, marks) => {
    for (const t of ts) {
      if (t.type === 'strong') walk(t.tokens, [...marks, 'strong']);
      else if (t.type === 'em') walk(t.tokens, [...marks, 'em']);
      else if (t.type === 'link') {
        const id = key();
        markDefs.push({ _key: id, _type: 'link', href: t.href });
        walk(t.tokens, [...marks, id]);
      } else if (t.type === 'br') spans.push({ _type: 'span', _key: key(), text: '\n', marks });
      else if (t.type !== 'image') spans.push({ _type: 'span', _key: key(), text: (t.text ?? t.raw ?? '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'), marks });
    }
  };
  walk(tokens, []);
  return { children: spans.length ? spans : [{ _type: 'span', _key: key(), text: '', marks: [] }], markDefs };
}
function toPortableText(md) {
  if (!md) return [];
  const out = [];
  for (const t of marked.lexer(md)) {
    if (t.type === 'heading') out.push({ _type: 'block', _key: key(), style: t.depth <= 2 ? 'h2' : 'h3', ...inline(t.tokens) });
    else if (t.type === 'paragraph') {
      const images = t.tokens.filter((x) => x.type === 'image');
      const rest = t.tokens.filter((x) => x.type !== 'image');
      if (rest.some((x) => (x.text ?? x.raw ?? '').trim())) out.push({ _type: 'block', _key: key(), style: 'normal', ...inline(rest) });
      images.forEach((i) => out.push({ _key: key(), ...img(i.href), alt: i.text || '' }));
    } else if (t.type === 'list') {
      for (const item of t.items) {
        const para = item.tokens.find((x) => x.type === 'text' || x.type === 'paragraph');
        out.push({ _type: 'block', _key: key(), style: 'normal', listItem: t.ordered ? 'number' : 'bullet', level: 1, ...inline(para?.tokens ?? [{ type: 'text', text: item.text }]) });
      }
    } else if (t.type === 'blockquote') out.push({ _type: 'block', _key: key(), style: 'blockquote', ...inline([{ type: 'text', text: t.text }]) });
  }
  return out;
}

const docs = [];
const brandId = (name) => `brand-${brandSeed.find((b) => b.name === name)?.slug ?? name.toLowerCase().replace(/\s+/g, '-')}`;
const oldLogo = { Philips: 'https://daanimagem.com.br/wp-content/uploads/2024/06/philips-img.webp', Carestream: 'https://daanimagem.com.br/wp-content/uploads/2024/06/carestream-img.webp' };
brandSeed.forEach((b, i) =>
  docs.push({
    _id: `brand-${b.slug}`, _type: 'brand', name: b.name, slug: slug(b.slug), featured: b.featured !== false, description: b.description, order: i,
    lines: b.lines.map((l) => ({ _key: key(), ...ref(`category-${l}`) })), logo: img(oldLogo[b.name]),
  }),
);

categories.forEach((c, i) =>
  docs.push({ _id: catId(c), _type: 'category', name: c.name, slug: slug(c.slug), parent: c.parent ? ref(`category-${c.parent}`) : undefined, brand: c.brand ? ref(`brand-${c.brand}`) : undefined, intro: c.intro || undefined, order: i }),
);

specialties.forEach((s) => docs.push({ _id: `specialty-${s.slug}`, _type: 'specialty', name: s.name, slug: slug(s.slug), intro: s.intro, image: img(s.image) }));

// Especialidades listadas na página de cada especialidade do site antigo também viram vínculo no produto.
const specByProduct = new Map();
for (const s of specialties) for (const n of s.productNames ?? []) {
  const p = products.find((x) => x.name.toLowerCase() === n.toLowerCase());
  if (p) specByProduct.set(p.slug, new Set([...(specByProduct.get(p.slug) ?? []), s.slug]));
}

products.forEach((p, i) => {
  const cat = p.subcategory ? `category-${p.category}-${p.subcategory}` : `category-${p.category}`;
  const specs = new Set([...(p.specialties ?? []), ...(specByProduct.get(p.slug) ?? [])]);
  docs.push({
    _id: `product-${p.slug}`,
    _type: 'product',
    name: p.name,
    slug: slug(p.slug),
    brand: ref(brandId(p.brand)),
    hidden: p.hidden ? true : undefined,
    category: ref(cat),
    specialties: [...specs].map((s) => ({ _key: key(), ...ref(`specialty-${s}`) })),
    summary: p.summary,
    order: i,
    description: p.description ?? [],
    highlights: p.highlights ?? [],
    specs: (p.specs ?? []).map((g) => ({ _key: key(), _type: 'specGroup', group: g.group, items: g.items })),
    images: [...new Set(p.images ?? [])].map(imgItem),
  });
});

posts.forEach((p) =>
  docs.push({ _id: `post-${p.slug}`, _type: 'post', title: p.title, slug: slug(p.slug), date: p.date, excerpt: p.excerpt, coverImage: img(p.coverImage), body: toPortableText(p.body) }),
);

for (const [id, fallback] of [['sobre', 'Sobre a Daan Imagem'], ['posVenda', 'Pós-venda'], ['contato', 'Contato']]) {
  const p = pages[id] ?? {};
  docs.push({ _id: id, _type: 'page', title: p.title || fallback, body: toPortableText(p.body), images: (p.images ?? []).map(imgItem) });
}
const h = pages.home ?? {};
docs.push({ _id: 'home', _type: 'home', heroTitle: h.heroTitle, heroSubtitle: h.heroSubtitle, aboutText: h.aboutText, highlights: h.highlights, heroImages: (h.heroImages ?? []).slice(0, 1).map(imgItem) });
const s = pages.site ?? {};
docs.push({
  _id: 'siteSettings',
  _type: 'siteSettings',
  logo: img(s.logo),
  phone: s.phone,
  mobile: s.mobile,
  whatsapp: s.whatsapp,
  email: 'comercial@daanimagem.com.br',
  address: s.address,
  address2: s.address2,
  hours: 'Segunda a sexta, das 8h às 18h',
  instagram: s.instagram,
  linkedin: s.linkedin,
  gtm: s.gtm,
  partners: brandSeed.filter((b) => b.featured !== false).map((b) => ({ _key: key(), name: b.name, logo: img(oldLogo[b.name]) })),
});

const clean = (o) => JSON.parse(JSON.stringify(o)); // remove undefined
fs.writeFileSync(new URL('../seed.ndjson', import.meta.url), docs.map((d) => JSON.stringify(clean(d))).join('\n') + '\n');
console.log(`seed.ndjson: ${docs.length} documentos`);
