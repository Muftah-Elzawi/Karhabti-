import type { Metadata } from 'next';
import Link from 'next/link';

import type { ServiceCategoryDto, ServiceDto } from '@/lib/api';
import { apiFetch } from '@/lib/api';
import { getLocale, getMessages } from '@/lib/i18n';

export function generateMetadata(): Metadata {
  return { title: getMessages().services.title };
}

async function loadCatalog(locale: string, category?: string) {
  const headers = { 'accept-language': locale };
  // apiFetch unwraps the { data, meta, error } envelope and returns data.
  const [categories, services] = await Promise.all([
    apiFetch<ServiceCategoryDto[]>('/service-categories', { headers }),
    apiFetch<ServiceDto[]>(
      `/services?limit=50${category ? `&category=${encodeURIComponent(category)}` : ''}`,
      { headers },
    ),
  ]);
  return { categories, services };
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const t = getMessages();
  const locale = getLocale();
  const { categories, services } = await loadCatalog(locale, searchParams.category);

  return (
    <main className="page">
      <div className="page-head">
        <h1 className="title">{t.services.title}</h1>
        <Link href="/" className="btn-ghost btn">
          {t.common.back}
        </Link>
      </div>

      <nav className="chip-row">
        <Link href="/services" className={`chip ${searchParams.category ? '' : 'chip-active'}`}>
          {t.services.all}
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/services?category=${encodeURIComponent(category.slug)}`}
            className={`chip ${searchParams.category === category.slug ? 'chip-active' : ''}`}
          >
            {category.name}
          </Link>
        ))}
      </nav>

      {services.length === 0 ? (
        <p className="tagline">{t.services.empty}</p>
      ) : (
        <div className="card-list">
          {services.map((service) => (
            <article key={service.id} className="card service-card">
              <div>
                <h2 className="service-name">{service.name}</h2>
                <p className="service-desc">{service.description}</p>
                <p className="service-meta">
                  <span className="service-price">
                    {service.basePriceLYD} {t.services.lyd}
                  </span>
                  {' · '}
                  {service.durationMinutes} {t.services.minutes}
                </p>
              </div>
              <Link className="btn btn-primary btn-fit" href={`/book/${service.id}`}>
                {t.services.book}
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
