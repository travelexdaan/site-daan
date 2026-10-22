// Camada de conteúdo. Se SANITY_PROJECT_ID estiver definido, o conteúdo vem do Sanity;
// caso contrário, dos arquivos em src/data (conteúdo migrado do site antigo).
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';
import { toHTML } from '@portabletext/to-html';
import { marked } from 'marked';

export type Spec = { group: string; items: string[] };
export type Product = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string | null;
  summary: string;
  description: string[];
  highlights: string[];
  specs: Spec[];
  specialties: string[];
  images: string[];
  catalogPdf?: string | null;
  legacyUrl?: string;
  hidden?: boolean;
};
export type Brand = { slug: string; name: string; description: string; lines: string[]; logo: string | null; featured: boolean };
export type Category = { slug: string; name: string; parent: string | null; intro: string; brand?: string | null };
export type Specialty = { slug: string; name: string; intro: string; image: string | null; productSlugs: string[] };
export type Post = { slug: string; title: string; date: string; excerpt: string; bodyHtml: string; coverImage: string | null; legacyUrl?: string };
export type RichPage = { title: string; bodyHtml: string; images: string[] };
export type Site = {
  phone: string;
  mobile: string;
  whatsapp: string;
  email: string;
  address: string;
  hours: string;
  instagram: string;
  linkedin: string;
  logo: string;
  gtm: string;
  partners: { name: string; logo: string | null }[];
};
export type Home = { heroTitle: string; heroSubtitle: string; aboutText: string; highlights: string[]; heroImages: string[]; aboutImage?: string | null };

const projectId = import.meta.env.SANITY_PROJECT_ID;
const dataset = import.meta.env.SANITY_DATASET || 'production';
const sanity = projectId
  ? createClient({ projectId, dataset, apiVersion: '2025-01-01', useCdn: false })
  : null;

const dataDir = path.resolve('src/data');
function readSeed<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8')) as T;
  } catch {
    return fallback;
  }
}
const md = (s: string | undefined | null) => (s ? (marked.parse(s, { async: false }) as string) : '');
const pt = (blocks: unknown) => (Array.isArray(blocks) ? toHTML(blocks as any) : '');

const cache = new Map<string, Promise<unknown>>();
function once<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key) as Promise<T>;
}

export const getProducts = () =>
  once('products', async (): Promise<Product[]> => {
    if (sanity) {
      return sanity.fetch(`*[_type == "product" && hidden != true] | order(order asc, name asc){
        "slug": slug.current, name, "brand": brand->name,
        "category": category->parent->slug.current, "subcategory": category->slug.current,
        "categoryRoot": category->slug.current, "hasParent": defined(category->parent),
        summary, "description": coalesce(description, []), "highlights": coalesce(highlights, []),
        "specs": coalesce(specs[]{group, items}, []), "specialties": coalesce(specialties[]->slug.current, []),
        "images": coalesce(images[].asset->url, []), "catalogPdf": catalogPdf.asset->url
      }`).then((rows: any[]) =>
        rows.map(({ categoryRoot, hasParent, ...p }) =>
          hasParent ? p : { ...p, category: categoryRoot, subcategory: null },
        ),
      );
    }
    return readSeed<Product[]>('products.json', [])
      .filter((p) => !p.hidden)
      .map((p) => ({ ...p, subcategory: p.subcategory ?? null }));
  });

export const getCategories = () =>
  once('categories', async (): Promise<Category[]> => {
    if (sanity) {
      return sanity.fetch(`*[_type == "category"] | order(order asc, name asc){
        "slug": slug.current, name, "parent": parent->slug.current, "intro": coalesce(intro, ""), "brand": brand->slug.current
      }`);
    }
    return readSeed<Category[]>('categories.json', []).map((c) => ({ ...c, parent: c.parent ?? null, intro: c.intro ?? '' }));
  });

export const getSpecialties = () =>
  once('specialties', async (): Promise<Specialty[]> => {
    if (sanity) {
      const rows: Specialty[] = await sanity.fetch(`*[_type == "specialty"] | order(name asc){
        "slug": slug.current, name, "intro": coalesce(intro, ""), "image": image.asset->url
      }`);
      const products = await getProducts();
      return rows.map((s) => ({ ...s, productSlugs: products.filter((p) => p.specialties.includes(s.slug)).map((p) => p.slug) }));
    }
    const products = await getProducts();
    const seed = readSeed<any[]>('specialties.json', []);
    return seed.map((s) => {
      const names: string[] = (s.productNames ?? []).map((n: string) => n.toLowerCase());
      const productSlugs = products
        .filter((p) => p.specialties.includes(s.slug) || names.includes(p.name.toLowerCase()))
        .map((p) => p.slug);
      return { slug: s.slug, name: s.name, intro: s.intro ?? '', image: s.image ?? null, productSlugs };
    });
  });

export const getPosts = () =>
  once('posts', async (): Promise<Post[]> => {
    if (sanity) {
      const rows: any[] = await sanity.fetch(`*[_type == "post" && defined(slug.current)] | order(date desc){
        "slug": slug.current, title, date, "excerpt": coalesce(excerpt, ""), body, "coverImage": coverImage.asset->url
      }`);
      return rows.map(({ body, ...p }) => ({ ...p, bodyHtml: pt(body) }));
    }
    return readSeed<any[]>('posts.json', [])
      .map((p) => ({ slug: p.slug, title: p.title, date: p.date, excerpt: p.excerpt ?? '', bodyHtml: md(p.body), coverImage: p.coverImage ?? null, legacyUrl: p.legacyUrl }))
      .sort((a, b) => b.date.localeCompare(a.date));
  });

type PagesSeed = { home: Home; sobre: any; posVenda: any; contato: any; site: Site };
const defaultSite: Site = {
  phone: '(41) 3045-8990',
  mobile: '(41) 9 9905-0013',
  whatsapp: '554130458990',
  email: 'comercial@daanimagem.com.br',
  address: 'R. Benjamin Constant, 67 - Sala 1401 - Centro, Curitiba/PR - CEP 80060-020',
  hours: 'Segunda a sexta, das 8h às 18h',
  instagram: 'https://www.instagram.com/daanimagem/',
  linkedin: 'https://www.linkedin.com/company/daan-imagem/',
  logo: '/logo-daan.svg',
  gtm: 'GTM-TGGN3V5',
  partners: [
    { name: 'Philips', logo: null },
    { name: 'Konica Minolta', logo: null },
    { name: 'Guerbet', logo: null },
  ],
};
const seedPages = () => readSeed<Partial<PagesSeed>>('pages.json', {});

export const getSite = () =>
  once('site', async (): Promise<Site> => {
    if (sanity) {
      const s = await sanity.fetch(`*[_id == "siteSettings"][0]{..., "logo": logo.asset->url, "partners": partners[]{name, "logo": logo.asset->url}}`);
      return { ...defaultSite, ...(s ?? {}) };
    }
    const s = seedPages().site ?? {};
    return { ...defaultSite, ...s, hours: 'Segunda a sexta, das 8h às 18h' } as Site;
  });

export const getHome = () =>
  once('home', async (): Promise<Home> => {
    const fallback: Home = {
      heroTitle: 'Soluções inteligentes e precisas em diagnósticos de imagem para clínicas e hospitais.',
      heroSubtitle: 'Representante autorizado Philips, Konica Minolta e Guerbet no Paraná.',
      aboutText: 'A Daan Imagem é uma referência no mercado de diagnóstico por imagem no Paraná, reconhecida pelo profissionalismo e excelência em suas relações comerciais.',
      highlights: ['Profissionais altamente qualificados', 'Atendimento em todo estado do Paraná', 'Preços e prazos competitivos'],
      heroImages: [],
    };
    if (sanity) {
      const h = await sanity.fetch(`*[_id == "home"][0]{heroTitle, heroSubtitle, aboutText, highlights, "heroImages": heroImages[].asset->url, "aboutImage": aboutImage.asset->url}`);
      return { ...fallback, ...(h ?? {}) };
    }
    const h: Partial<Home> = seedPages().home ?? {};
    return {
      heroTitle: h.heroTitle || fallback.heroTitle,
      heroSubtitle: h.heroSubtitle || fallback.heroSubtitle,
      aboutText: h.aboutText || fallback.aboutText,
      highlights: h.highlights?.length ? h.highlights : fallback.highlights,
      heroImages: h.heroImages ?? [],
      aboutImage: h.aboutImage ?? null,
    };
  });

export async function getRichPage(id: 'sobre' | 'posVenda' | 'contato', fallbackTitle: string): Promise<RichPage> {
  if (sanity) {
    const p = await sanity.fetch(`*[_id == $id][0]{title, body, "images": images[].asset->url}`, { id });
    return { title: p?.title || fallbackTitle, bodyHtml: pt(p?.body), images: p?.images ?? [] };
  }
  const p = (seedPages() as any)[id] ?? {};
  return { title: p.title || fallbackTitle, bodyHtml: md(p.body), images: p.images ?? [] };
}

export const getBrands = () =>
  once('brands', async (): Promise<Brand[]> => {
    if (sanity) {
      return sanity.fetch(`*[_type == "brand"] | order(order asc, name asc){
        "slug": coalesce(slug.current, lower(name)), name, "description": coalesce(description, ""),
        "lines": coalesce(lines[]->slug.current, []), "logo": logo.asset->url, "featured": featured != false
      }`);
    }
    return readSeed<Brand[]>('brands.json', []).map((b) => ({ ...b, logo: b.logo ?? null, featured: b.featured !== false }));
  });

// Helpers de navegação. Subcategorias sem equipamentos e sem marca definida ficam fora do menu.
export async function getCategoryTree() {
  const cats = await getCategories();
  const products = await getProducts();
  return cats
    .filter((c) => !c.parent)
    .map((c) => ({
      ...c,
      children: cats.filter((x) => x.parent === c.slug && (Boolean(x.brand) || products.some((p) => p.category === c.slug && p.subcategory === x.slug))),
    }));
}

export function productUrl(p: Product) {
  return `/equipamentos/${p.category}/${p.subcategory ? p.subcategory + '/' : ''}${p.slug}/`;
}

export function whatsappLink(site: Site, text?: string) {
  const q = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${site.whatsapp}${q}`;
}

export function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}
