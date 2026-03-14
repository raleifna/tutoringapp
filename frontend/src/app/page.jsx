export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <span className="eyebrow">TutorConnect</span>
        <h1>Project Workspace</h1>

        <div className="link-grid">
          <a href="/api/v1/health">Gateway health</a>
          <a href="http://localhost:5050/health">Backend direct</a>
          <a href="http://localhost:3000">Frontend direct</a>
        </div>
      </section>

      <section className="stack-card">
        <h2>Current Stack</h2>
        <ul>
          <li>Next.js frontend on port 3000</li>
          <li>Express backend on port 5000, mapped to host 5050</li>
          <li>Nginx gateway on port 8080</li>
          <li>Docker Compose local deployment config</li>
        </ul>
      </section>
    </main>
  );
}
