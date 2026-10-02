// Gera o arquivo _redirects (Netlify/Cloudflare) com 301 dos endereços antigos do WordPress.
import { getPosts } from '../lib/data';

// Arquivos que começam com _ são ignorados pelo Astro em src/pages; por isso a rota dinâmica.
export const getStaticPaths = () => [{ params: { file: '_redirects' } }];

export async function GET() {
  const posts = await getPosts();
  const lines = [
    ...posts.map((p) => `/${p.slug}/ /blog/${p.slug}/ 301`),
    '/feed/ /blog/ 301',
    '/category/* /blog/ 301',
    '/wp-admin/* / 301',
  ];
  return new Response(lines.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain' } });
}
