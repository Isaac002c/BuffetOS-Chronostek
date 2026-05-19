'use client';

import Link from 'next/link';

export default function Breadcrumbs({ items = [] }) {
  if (!items.length) return null;

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => (
          <li key={item.label} className={index === items.length - 1 ? 'current' : ''}>
            {index < items.length - 1 ? (
              <Link href={item.href} className="breadcrumb-link">
                {item.label}
              </Link>
            ) : (
              <span>{item.label}</span>
            )}
            {index < items.length - 1 && <span className="breadcrumb-separator">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
