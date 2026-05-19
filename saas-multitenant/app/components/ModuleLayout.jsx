'use client';

export default function ModuleLayout({ children }) {
  return (
    <div className="module-container">
      <main className="module-content">
        {children}
      </main>
    </div>
  );
}
