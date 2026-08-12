/**
 * scripts/build-pages.mjs - Genereert de losse pagina's uit content/pages.mjs
 *
 * Waarom een generator en geen losse HTML-bestanden: er zijn tien pagina's met
 * dezelfde navigatie, footer, meta-tags en schema-opmaak. Handmatig bijhouden
 * betekent dat ze binnen een maand uit elkaar lopen. Nu staat de inhoud in
 * content/pages.mjs en de vorm hier.
 *
 * Draait automatisch mee in `npm run prebuild`, dus ook op Netlify.
 * Genereert daarnaast het blanco LMRA-formulier als PDF en de sitemap.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { jsPDF } from 'jspdf';
import { SITE, TEMPLATE_PAGES, ARTICLE_PAGES, FORM_PAGE } from '../content/pages.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const today = new Date().toISOString().slice(0, 10);

const MONTHS = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];

/** 2026-03-18 -> 18 maart 2026 */
function dutchDate(iso) {
    const [y, m, d] = String(iso).split('-').map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
}

/* ------------------------------------------------------------------- layout */

function navigation() {
    return `
    <nav class="fixed w-full z-50 bg-[#00447c]/95 backdrop-blur-sm text-white shadow-lg border-b border-[#003366]">
        <div class="max-w-5xl mx-auto px-4 sm:px-6">
            <div class="flex justify-between h-16 items-center">
                <a href="/" class="flex items-center gap-3">
                    <div class="bg-white/10 p-2 rounded-lg border border-white/20">
                        <i class="fa-solid fa-shield-halved text-xl text-blue-200"></i>
                    </div>
                    <div>
                        <span class="font-bold text-xl tracking-tight">LMRA <span class="text-blue-300">PRO</span></span>
                        <span class="text-[10px] block text-blue-200 uppercase tracking-wider">Open Source PWA</span>
                    </div>
                </a>
                <div class="flex items-center gap-3 text-sm font-medium">
                    <a href="/kennisbank" class="hidden sm:inline hover:text-blue-200 transition-colors">Kennisbank</a>
                    <a href="/app" class="bg-white text-[#00447c] px-4 py-2 rounded-full font-bold hover:bg-blue-50 transition-all shadow-md">
                        <i class="fa-solid fa-rocket mr-1"></i> Start LMRA
                    </a>
                </div>
            </div>
        </div>
    </nav>`;
}

function footer() {
    return `
    <footer class="bg-slate-950 text-slate-400 py-12 border-t border-slate-800">
        <div class="max-w-5xl mx-auto px-4 sm:px-6">
            <div class="grid md:grid-cols-3 gap-8 mb-8">
                <div>
                    <h2 class="text-white font-bold text-base mb-3">LMRA Pro</h2>
                    <p class="text-sm">Gratis en open source hulpmiddel voor de Laatste Minuut Risico Analyse. Gemaakt door Brink Multimedia.</p>
                </div>
                <div>
                    <h2 class="text-white font-bold text-base mb-3">Per soort werk</h2>
                    <ul class="space-y-1.5 text-sm">
                        ${TEMPLATE_PAGES.map((p) => `<li><a href="/${p.slug}" class="hover:text-white transition-colors">${esc(p.h1)}</a></li>`).join('\n                        ')}
                    </ul>
                </div>
                <div>
                    <h2 class="text-white font-bold text-base mb-3">Meer</h2>
                    <ul class="space-y-1.5 text-sm">
                        <li><a href="/kennisbank" class="hover:text-white transition-colors">Kennisbank</a></li>
                        <li><a href="/${FORM_PAGE.slug}" class="hover:text-white transition-colors">Gratis LMRA-formulier (PDF)</a></li>
                        <li><a href="/app" class="hover:text-white transition-colors">Start de app</a></li>
                        <li><a href="/privacy" class="hover:text-white transition-colors">Privacyverklaring</a></li>
                        <li><a href="/voorwaarden" class="hover:text-white transition-colors">Algemene voorwaarden</a></li>
                        <li><button type="button" id="btnCookieSettingsLanding" class="hover:text-white transition-colors cursor-pointer">Cookievoorkeuren</button></li>
                    </ul>
                </div>
            </div>
            <div class="border-t border-slate-800 pt-6 text-xs">
                <p>&copy; ${new Date().getFullYear()} Brink Multimedia. Open source onder de MIT-licentie.</p>
            </div>
        </div>
    </footer>`;
}

function faqSchema(faq) {
    if (!faq || faq.length === 0) return '';
    const payload = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
    };
    return `\n    <script type="application/ld+json">\n${JSON.stringify(payload, null, 2)}\n    </script>`;
}

function articleSchema(page) {
    const payload = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: page.h1,
        description: page.description,
        inLanguage: 'nl-NL',
        datePublished: page.published || today,
        dateModified: page.modified || page.published || today,
        author: { '@type': 'Organization', name: 'Brink Multimedia', url: SITE.baseUrl },
        publisher: { '@type': 'Organization', name: 'Brink Multimedia', url: SITE.baseUrl },
        mainEntityOfPage: `${SITE.baseUrl}/${page.slug}`,
    };
    return `\n    <script type="application/ld+json">\n${JSON.stringify(payload, null, 2)}\n    </script>`;
}

function breadcrumbSchema(page, parentName, parentUrl) {
    const items = [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE.baseUrl}/` }];
    if (parentName) items.push({ '@type': 'ListItem', position: 2, name: parentName, item: `${SITE.baseUrl}${parentUrl}` });
    items.push({ '@type': 'ListItem', position: items.length + 1, name: page.h1, item: `${SITE.baseUrl}/${page.slug}` });
    const payload = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
    return `\n    <script type="application/ld+json">\n${JSON.stringify(payload, null, 2)}\n    </script>`;
}

function renderSections(sections) {
    return sections
        .map((section) => {
            const paragraphs = (section.paragraphs || [])
                .map((p) => `                <p class="text-slate-600 leading-relaxed mb-4">${p}</p>`)
                .join('\n');
            const list =
                section.list && section.list.length > 0
                    ? `                <ul class="space-y-2 mb-4">\n` +
                      section.list
                          .map(
                              (li) =>
                                  `                    <li class="flex gap-3 text-slate-600 leading-relaxed"><i class="fa-solid fa-circle-check text-[#00447c] mt-1 shrink-0"></i><span>${li}</span></li>`
                          )
                          .join('\n') +
                      `\n                </ul>`
                    : '';
            return `            <section class="mb-8">
                <h2 class="text-2xl font-bold text-slate-900 mb-3">${esc(section.h2)}</h2>
${paragraphs}
${list}
            </section>`;
        })
        .join('\n');
}

function renderFaq(faq) {
    if (!faq || faq.length === 0) return '';
    return `            <section class="mb-8">
                <h2 class="text-2xl font-bold text-slate-900 mb-4">Veelgestelde vragen</h2>
                <div class="space-y-3">
${faq
    .map(
        (item) => `                    <details class="group bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <summary class="font-bold text-slate-900 cursor-pointer list-none flex justify-between items-center gap-4">
                            ${esc(item.q)}
                            <i class="fa-solid fa-chevron-down text-slate-400 group-open:rotate-180 transition-transform"></i>
                        </summary>
                        <p class="text-slate-600 text-sm mt-3 leading-relaxed">${item.a}</p>
                    </details>`
    )
    .join('\n')}
                </div>
            </section>`;
}

function callToAction(page) {
    const appUrl = page.template ? `/app?template=${page.template}` : '/app';
    const label = page.template ? `Start deze LMRA direct` : 'Start een LMRA';
    return `            <section class="bg-slate-900 text-white rounded-2xl p-6 md:p-8 mb-8">
                <h2 class="text-xl font-bold mb-2">${esc(label)}</h2>
                <p class="text-slate-300 text-sm mb-5">
                    Geen account, geen installatie en geen kosten. De app opent direct met${
                        page.template ? ' de juiste vragenlijst' : ' de basisvragen'
                    }, werkt offline en levert een PDF-rapport met datum, tijd, locatie en handtekening.
                </p>
                <div class="flex flex-col sm:flex-row gap-3">
                    <a href="${appUrl}" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                        <i class="fa-solid fa-rocket"></i> ${esc(label)}
                    </a>
                    <a href="/${FORM_PAGE.slug}" class="px-6 py-3 bg-transparent border-2 border-slate-700 text-slate-200 font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                        <i class="fa-solid fa-file-pdf"></i> Formulier op papier
                    </a>
                </div>
            </section>`;
}

function relatedLinks(currentSlug) {
    const others = [...TEMPLATE_PAGES, ...ARTICLE_PAGES].filter((p) => p.slug !== currentSlug).slice(0, 5);
    return `            <section class="mb-4">
                <h2 class="text-2xl font-bold text-slate-900 mb-3">Verder lezen</h2>
                <ul class="space-y-2">
${others
    .map(
        (p) =>
            `                    <li><a href="/${p.slug}" class="text-[#00447c] font-medium hover:underline">${esc(p.h1)}</a></li>`
    )
    .join('\n')}
                </ul>
            </section>`;
}

function page(pageData, options = {}) {
    const { isArticle = false, parentName = null, parentUrl = '/', extraTop = '' } = options;
    const canonical = `${SITE.baseUrl}/${pageData.slug}`;

    return `<!DOCTYPE html>
<html lang="nl" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(pageData.title)}</title>
    <meta name="description" content="${esc(pageData.description)}">
    <meta name="robots" content="index, follow">
    <meta name="theme-color" content="#00447c">
    <link rel="canonical" href="${canonical}">
    <link rel="icon" type="image/png" href="/icon-192.png">
    <link rel="apple-touch-icon" href="/icon-192.png">
    <link rel="manifest" href="/manifest.json">

    <meta property="og:type" content="${isArticle ? 'article' : 'website'}">
    <meta property="og:site_name" content="LMRA Pro">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="${esc(pageData.title)}">
    <meta property="og:description" content="${esc(pageData.description)}">
    <meta property="og:image" content="${SITE.baseUrl}/screenshot-app.png">
    <meta property="og:locale" content="nl_NL">
    <meta name="twitter:card" content="summary_large_image">${isArticle ? articleSchema(pageData) : ''}${faqSchema(pageData.faq)}${breadcrumbSchema(pageData, parentName, parentUrl)}

    <script type="module" src="/src/landing.ts"></script>
</head>
<body class="bg-slate-50 text-slate-800 font-sans antialiased">
${navigation()}

    <header class="bg-slate-900 text-white pt-28 pb-14">
        <div class="max-w-3xl mx-auto px-4 sm:px-6">
            <nav aria-label="Kruimelpad" class="text-xs text-slate-400 mb-4">
                <a href="/" class="hover:text-white">Home</a>
                ${parentName ? `<span class="mx-1">/</span><a href="${parentUrl}" class="hover:text-white">${esc(parentName)}</a>` : ''}
                <span class="mx-1">/</span><span class="text-slate-300">${esc(pageData.h1)}</span>
            </nav>
            <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">${esc(pageData.h1)}</h1>
            <p class="text-lg text-slate-300 leading-relaxed">${pageData.intro}</p>
            ${
                pageData.published
                    ? `<p class="text-xs text-slate-400 mt-5">
                <time datetime="${pageData.published}">Gepubliceerd op ${dutchDate(pageData.published)}</time>${
                          pageData.modified && pageData.modified !== pageData.published
                              ? ` &middot; <time datetime="${pageData.modified}">bijgewerkt op ${dutchDate(pageData.modified)}</time>`
                              : ''
                      }
            </p>`
                    : ''
            }
        </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 sm:px-6 py-12">
${extraTop}
${renderSections(pageData.sections)}
${callToAction(pageData)}
${renderFaq(pageData.faq)}
${relatedLinks(pageData.slug)}
    </main>
${footer()}
</body>
</html>
`;
}

/* ------------------------------------------------------- kennisbank & 404 */

function kennisbankPage() {
    const card = (p, tag) => `                <a href="/${p.slug}" class="block bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-[#00447c]">${tag}</span>
                    <h3 class="font-bold text-slate-900 mt-1 mb-1">${esc(p.h1)}</h3>
                    <p class="text-sm text-slate-600">${esc(p.description)}</p>
                    ${p.published ? `<p class="text-[11px] text-slate-400 mt-2">${dutchDate(p.published)}</p>` : ''}
                </a>`;

    return `<!DOCTYPE html>
<html lang="nl" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kennisbank LMRA - Uitleg, Checklists en Formulieren</title>
    <meta name="description" content="Alles over de Laatste Minuut Risico Analyse: het verschil met RI&amp;E en TRA, wat je controleert, werken bij hitte en checklists per soort werk.">
    <meta name="robots" content="index, follow">
    <meta name="theme-color" content="#00447c">
    <link rel="canonical" href="${SITE.baseUrl}/kennisbank">
    <link rel="icon" type="image/png" href="/icon-192.png">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${SITE.baseUrl}/kennisbank">
    <meta property="og:title" content="Kennisbank LMRA - Uitleg, Checklists en Formulieren">
    <meta property="og:description" content="Uitleg over de LMRA, checklists per soort werk en een gratis printbaar formulier.">
    <meta property="og:image" content="${SITE.baseUrl}/screenshot-app.png">
    <script type="module" src="/src/landing.ts"></script>
</head>
<body class="bg-slate-50 text-slate-800 font-sans antialiased">
${navigation()}
    <header class="bg-slate-900 text-white pt-28 pb-14">
        <div class="max-w-4xl mx-auto px-4 sm:px-6">
            <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Kennisbank</h1>
            <p class="text-lg text-slate-300 leading-relaxed">
                Uitleg over de Laatste Minuut Risico Analyse in gewone taal, plus checklists per soort werk.
                Geschreven voor monteurs en technici, niet voor beleidsmakers.
            </p>
        </div>
    </header>
    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <section class="mb-10">
            <h2 class="text-2xl font-bold text-slate-900 mb-4">Uitleg en achtergrond</h2>
            <div class="grid gap-4 sm:grid-cols-2">
${ARTICLE_PAGES.map((p) => card(p, 'Artikel')).join('\n')}
${card(FORM_PAGE, 'Download')}
            </div>
        </section>
        <section>
            <h2 class="text-2xl font-bold text-slate-900 mb-4">Checklist per soort werk</h2>
            <div class="grid gap-4 sm:grid-cols-2">
${TEMPLATE_PAGES.map((p) => card(p, 'Checklist')).join('\n')}
            </div>
        </section>
    </main>
${footer()}
</body>
</html>
`;
}

function notFoundPage() {
    return `<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pagina niet gevonden - LMRA Pro</title>
    <meta name="robots" content="noindex, follow">
    <link rel="icon" type="image/png" href="/icon-192.png">
    <script type="module" src="/src/landing.ts"></script>
</head>
<body class="bg-slate-50 text-slate-800 font-sans antialiased">
${navigation()}
    <main class="max-w-2xl mx-auto px-4 sm:px-6 pt-32 pb-20 text-center">
        <h1 class="text-4xl font-extrabold text-slate-900 mb-4">Deze pagina bestaat niet</h1>
        <p class="text-slate-600 mb-8">Misschien is de link verouderd. Hieronder kom je verder.</p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/app" class="px-6 py-3 bg-[#00447c] text-white font-bold rounded-xl">Start een LMRA</a>
            <a href="/kennisbank" class="px-6 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl">Naar de kennisbank</a>
        </div>
    </main>
${footer()}
</body>
</html>
`;
}

/* --------------------------------------------------- blanco formulier (PDF) */

function buildBlankForm() {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const questions = [
        'Voel ik mij fysiek en mentaal fit voor deze klus?',
        'Weet ik wat te doen bij nood (alarmnummer, vluchtroute)?',
        'Is de werkvergunning correct ingevuld en getekend?',
        'Heb ik de taakrisicoanalyse (TRA) gelezen en begrepen?',
        'Is de installatie veiliggesteld (LOTOTO / vrij van spanning)?',
        "Heb ik de juiste PBM's en gekeurd gereedschap?",
        'Is de werkplek afgezet en vrij van struikelgevaar?',
    ];

    doc.setFillColor(0, 68, 124);
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.text('LMRA - Laatste Minuut Risico Analyse', 12, 13);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Blanco formulier - gratis te gebruiken en aan te passen - lmrapro.nl', 12, 20);

    let y = 36;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);

    const field = (label, x, width) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, x, y);
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.2);
        doc.line(x, y + 5, x + width, y + 5);
    };

    field('Bedrijf / opdrachtgever', 12, 88);
    field('Monteur', 110, 88);
    y += 14;
    field('Locatie / asset', 12, 88);
    field('Werkorder', 110, 88);
    y += 14;
    field('Datum', 12, 40);
    field('Starttijd', 60, 30);
    field('Geldig tot', 98, 30);
    field('Soort werk', 136, 62);
    y += 16;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Controlepunten', 12, y);
    y += 2;
    doc.setDrawColor(0, 68, 124);
    doc.setLineWidth(0.5);
    doc.line(12, y, 60, y);
    y += 7;

    doc.setFontSize(8.5);
    questions.forEach((q, index) => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        const lines = doc.splitTextToSize(`${index + 1}. ${q}`, 140);
        doc.text(lines, 12, y);

        // JA / NEE vakjes
        doc.setDrawColor(120, 120, 120);
        doc.setLineWidth(0.3);
        doc.rect(160, y - 3.5, 5, 5);
        doc.text('JA', 166, y);
        doc.rect(178, y - 3.5, 5, 5);
        doc.text('NEE', 184, y);

        y += Math.max(lines.length * 4, 5) + 1;

        // Regel voor de maatregel bij NEE
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(7);
        doc.text('Maatregel bij NEE:', 16, y + 3);
        doc.setDrawColor(190, 190, 190);
        doc.setLineWidth(0.2);
        doc.line(44, y + 3.5, 195, y + 3.5);
        doc.setFontSize(8.5);
        y += 10;
    });

    y += 2;
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Opmerkingen', 12, y);
    y += 4;
    doc.setDrawColor(190, 190, 190);
    for (let i = 0; i < 3; i++) {
        doc.line(12, y + i * 7, 195, y + i * 7);
    }
    y += 24;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.rect(12, y - 3.5, 4, 4);
    doc.text("Ik verklaar dat ik deze LMRA naar waarheid heb ingevuld en de risico's begrijp.", 19, y);
    y += 12;

    doc.setFont('helvetica', 'bold');
    doc.text('Handtekening monteur', 12, y);
    doc.line(12, y + 14, 95, y + 14);
    doc.text('Handtekening buddy / toezicht', 110, y);
    doc.line(110, y + 14, 195, y + 14);

    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.setFont('helvetica', 'normal');
    doc.text(
        'Dit formulier is een hulpmiddel. De eigen verantwoordelijkheid voor veilig werken en het naleven van VCA-, Arbo- en',
        12,
        282
    );
    doc.text('bedrijfsvoorschriften blijft altijd bij de uitvoerder en de werkgever. Digitale versie: lmrapro.nl', 12, 286);

    const out = path.join(rootDir, 'public', 'lmra-formulier-blanco.pdf');
    fs.writeFileSync(out, Buffer.from(doc.output('arraybuffer')));
    return out;
}

/* -------------------------------------------------------------- sitemap */

function buildSitemap(pages) {
    const staticPages = [
        { loc: `${SITE.baseUrl}/`, priority: '1.0', freq: 'weekly' },
        { loc: `${SITE.baseUrl}/app`, priority: '0.9', freq: 'weekly' },
        { loc: `${SITE.baseUrl}/kennisbank`, priority: '0.8', freq: 'monthly' },
    ];
    const generated = pages.map((page) => ({
        loc: `${SITE.baseUrl}/${page.slug}`,
        priority: '0.7',
        freq: 'monthly',
        lastmod: page.modified || page.published || today,
    }));
    const legal = [
        { loc: `${SITE.baseUrl}/privacy`, priority: '0.4', freq: 'monthly' },
        { loc: `${SITE.baseUrl}/voorwaarden`, priority: '0.4', freq: 'monthly' },
    ];

    const urls = [...staticPages, ...generated, ...legal]
        .map(
            (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod || today}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
        )
        .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
    fs.writeFileSync(path.join(rootDir, 'public', 'sitemap.xml'), xml);
}

/* ------------------------------------------------------------------ main */

const written = [];

for (const tpl of TEMPLATE_PAGES) {
    fs.writeFileSync(path.join(rootDir, `${tpl.slug}.html`), page(tpl, { parentName: 'Kennisbank', parentUrl: '/kennisbank' }));
    written.push(tpl);
}

for (const article of ARTICLE_PAGES) {
    fs.writeFileSync(
        path.join(rootDir, `${article.slug}.html`),
        page(article, { isArticle: true, parentName: 'Kennisbank', parentUrl: '/kennisbank' })
    );
    written.push(article);
}

const downloadBlock = `            <section class="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-8">
                <h2 class="text-xl font-bold text-emerald-900 mb-2">Download het formulier</h2>
                <p class="text-sm text-emerald-900/80 mb-4">Eén A4, direct printbaar. Geen registratie nodig.</p>
                <a href="${FORM_PAGE.downloadFile}" download class="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all">
                    <i class="fa-solid fa-file-arrow-down"></i> LMRA-formulier (PDF)
                </a>
            </section>`;

fs.writeFileSync(
    path.join(rootDir, `${FORM_PAGE.slug}.html`),
    page(FORM_PAGE, { parentName: 'Kennisbank', parentUrl: '/kennisbank', extraTop: downloadBlock })
);
written.push(FORM_PAGE);

fs.writeFileSync(path.join(rootDir, 'kennisbank.html'), kennisbankPage());
fs.writeFileSync(path.join(rootDir, '404.html'), notFoundPage());

const formPath = buildBlankForm();
buildSitemap(written);

console.log(`\x1b[36m%s\x1b[0m`, `📄 ${written.length + 2} pagina's gegenereerd:`);
console.log(`   ${written.map((w) => w.slug).join(', ')}, kennisbank, 404`);
console.log(`   Blanco formulier: ${path.relative(rootDir, formPath)}`);
console.log(`   Sitemap bijgewerkt met ${written.length + 5} URL's`);
