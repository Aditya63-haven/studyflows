import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import '../landing.css';

type FeatureIconName = 'calendar' | 'layers' | 'check' | 'chart' | 'refresh';

const FEATURE_ICONS: Record<FeatureIconName, ReactNode> = {
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="M8 14h2M14 14h2M8 17.5h2M14 17.5h2" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z" />
      <path d="m3.5 12 8.5 4.5 8.5-4.5" />
      <path d="m3.5 16.5 8.5 4.5 8.5-4.5" />
    </>
  ),
  check: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="m8 12 2.7 2.7L16.5 9" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14.9-4M4 5v5h5" />
      <path d="M4 13a8 8 0 0 0 14.9 4M20 19v-5h-5" />
    </>
  ),
};

const FeatureIcon = ({ name }: { name: FeatureIconName }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {FEATURE_ICONS[name]}
  </svg>
);

interface Feature {
  icon: FeatureIconName;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: 'calendar',
    title: 'Smart Study Planning',
    description: 'Turn your topics and deadlines into a practical, day-by-day study plan.',
  },
  {
    icon: 'layers',
    title: 'Subject Workspaces',
    description: 'Keep your notes, quizzes and flashcards organized by subject.',
  },
  {
    icon: 'check',
    title: 'Tasks & Assessments',
    description: 'Manage learning, revision and assignment tasks with priorities and deadlines.',
  },
  {
    icon: 'chart',
    title: 'Progress Analytics',
    description: 'Track study time, quiz scores, streaks and identify weak topics.',
  },
  {
    icon: 'refresh',
    title: 'Revision Management',
    description: 'Use spaced repetition and scheduled reviews to strengthen your recall.',
  },
];

const STEPS = [
  {
    title: 'Organize',
    description: 'Add your subjects, topics and exam deadlines.',
  },
  {
    title: 'Plan',
    description: 'Set your availability and generate a personalized study plan.',
  },
  {
    title: 'Track & Improve',
    description: 'Log study sessions, take quizzes and revise with scheduled reviews.',
  },
];

const previewDate = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
  .format(new Date())
  .toUpperCase();

const DashboardPreview = () => (
  <figure className="landing-preview-frame">
    <div
      className="landing-preview"
      role="img"
      aria-label="Preview of the StudyFlows dashboard with today's sessions and attention items"
    >
      <div aria-hidden="true">
        <div className="landing-preview-topbar">
          <span className="landing-preview-wordmark">
            <span className="landing-preview-logo">S</span>
            StudyFlows
          </span>
          <span className="landing-preview-top-actions">
            <span>Notifications · 0</span>
            <span className="landing-preview-avatar">A</span>
          </span>
        </div>

        <div className="landing-preview-body">
          <aside className="landing-preview-sidebar">
            <span className="landing-preview-nav active">Dashboard</span>
            <span className="landing-preview-nav">Planner</span>
            <span className="landing-preview-nav">Subjects</span>
            <span className="landing-preview-nav">Tasks &amp; assessments</span>
            <span className="landing-preview-nav">Progress</span>
            <span className="landing-preview-group">Study planning</span>
            <span className="landing-preview-nav">Availability</span>
            <span className="landing-preview-nav">Progress &amp; history</span>
            <span className="landing-preview-nav">Revision</span>
            <span className="landing-preview-group">Library</span>
            <span className="landing-preview-nav">Search</span>
            <span className="landing-preview-nav">Bookmarks</span>
          </aside>

          <div className="landing-preview-main">
            <div className="landing-preview-heading">
              <div>
                <span className="landing-preview-date">{previewDate}</span>
                <h3>A little progress, every day.</h3>
                <p>Here&apos;s your study plan for today.</p>
              </div>
              <span className="landing-preview-action">Review adjustment</span>
            </div>

            <div className="landing-preview-command">
              <span className="landing-preview-sparkle">✦</span>
              <span className="landing-preview-command-text">
                e.g. Move unfinished Maths work to the weekend
              </span>
              <span className="landing-preview-send">Send</span>
            </div>

            <div className="landing-preview-grid">
              <div className="landing-preview-card">
                <div className="landing-preview-card-title">
                  <span>Today&apos;s sessions</span>
                  <span>0 min / 120 min available</span>
                </div>
                <div className="landing-preview-progress">
                  <span />
                </div>
                <p className="landing-preview-note">
                  120 minutes of study capacity remain.
                </p>
                <div className="landing-preview-empty">
                  <strong>No sessions planned today</strong>
                  <span>
                    Mark an exam plan topic or finish a quiz review to see sessions here.
                  </span>
                  <em>Plan your day</em>
                </div>
              </div>

              <div className="landing-preview-card">
                <div className="landing-preview-card-title">
                  <span>Needs attention</span>
                </div>
                <p className="landing-preview-note">
                  Nothing needs attention right now. Keep up the steady progress.
                </p>
                <p className="landing-preview-footnote">
                  Planned against a 120-minute daily budget.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </figure>
);

const BookStack = () => (
  <svg
    className="landing-books"
    viewBox="0 0 220 160"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="landing-book-light" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#d7f0e3" />
        <stop offset="100%" stopColor="#9bcab5" />
      </linearGradient>
      <linearGradient id="landing-book-mid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#bde2d1" />
        <stop offset="100%" stopColor="#79a995" />
      </linearGradient>
      <linearGradient id="landing-book-dark" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#37584c" />
        <stop offset="100%" stopColor="#223b32" />
      </linearGradient>
    </defs>
    <ellipse cx="111" cy="142" rx="82" ry="12" fill="#0b100d" opacity="0.4" />
    <g transform="translate(0 6)">
      <path d="M24 118 111 84l87 34-87 34-87-34Z" fill="url(#landing-book-dark)" />
      <path d="m24 118 87 34v10l-87-34v-10Z" fill="#15261f" />
      <path d="m111 152 87-34v10l-87 34v-10Z" fill="#1b3128" />
      <path d="M39 113 111 85l72 28-72 28-72-28Z" fill="url(#landing-book-mid)" />
      <path d="M39 113 111 141v7l-72-28v-7Z" fill="#5c8978" />
      <path d="m111 141 72-28v7l-72 28v-7Z" fill="#6c9a87" />
      <path d="M54 106 111 84l57 22-57 22-57-22Z" fill="url(#landing-book-light)" />
      <path d="M54 106 111 128v6l-57-22v-6Z" fill="#87b8a3" />
      <path d="m111 128 57-22v6l-57 22v-6Z" fill="#97c7b3" />
      <path
        d="M72 104c13-6 26-9 39-9s26 3 39 9"
        fill="none"
        stroke="#effaf4"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.65"
      />
    </g>
  </svg>
);

export const LandingPage = () => {
  const year = new Date().getFullYear();

  return (
    <div className="landing">
      <a className="landing-skip" href="#landing-main">
        Skip to content
      </a>

      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <Link to="/" className="landing-wordmark" aria-label="StudyFlows home">
            <span className="landing-logo" aria-hidden="true">
              S
            </span>
            <span>StudyFlows</span>
          </Link>

          <nav className="landing-nav" aria-label="Landing page">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
          </nav>

          <div className="landing-header-actions">
            <Link to="/login" className="landing-button landing-button--ghost">
              Log in
            </Link>
            <Link to="/register" className="landing-button">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main id="landing-main">
        <section className="landing-hero">
          <div className="landing-container landing-hero-inner">
            <div className="landing-hero-copy">
              <span className="landing-badge">
                <span className="landing-badge-sparkle" aria-hidden="true">
                  ✦
                </span>
                A complete study companion
              </span>

              <h1>
                Make every study session <span className="landing-hero-accent">count.</span>
              </h1>

              <p className="landing-hero-lede">
                Organize your subjects, build smarter study plans, stay focused and track your
                academic progress — all in one place.
              </p>

              <div className="landing-hero-actions">
                <Link to="/register" className="landing-button landing-button--large">
                  Get Started
                  <span aria-hidden="true">→</span>
                </Link>
                <a href="#features" className="landing-button landing-button--ghost landing-button--large">
                  Explore Features
                </a>
              </div>

              <ul className="landing-hero-points">
                <li>
                  <FeatureIcon name="calendar" />
                  Plan smarter
                </li>
                <li>
                  <FeatureIcon name="chart" />
                  Track progress
                </li>
                <li>
                  <FeatureIcon name="refresh" />
                  Revise effectively
                </li>
              </ul>
            </div>

            <div className="landing-hero-preview">
              <DashboardPreview />
            </div>
          </div>
        </section>

        <section id="features" className="landing-section landing-features">
          <div className="landing-container">
            <div className="landing-section-heading">
              <span className="landing-eyebrow">Features</span>
              <h2>Everything you need for focused, consistent study.</h2>
            </div>

            <div className="landing-features-grid">
              {FEATURES.map((feature) => (
                <article key={feature.title} className="landing-feature-card">
                  <span className="landing-feature-icon">
                    <FeatureIcon name={feature.icon} />
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="landing-section landing-how-it-works">
          <div className="landing-container">
            <div className="landing-section-heading">
              <span className="landing-eyebrow">How it works</span>
              <h2>Get started in three simple steps.</h2>
            </div>

            <ol className="landing-steps">
              {STEPS.map((step, index) => (
                <li key={step.title} className="landing-step">
                  <span className="landing-step-number">{index + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="landing-cta-section">
          <div className="landing-container">
            <div className="landing-cta">
              <div className="landing-cta-art">
                <BookStack />
              </div>
              <div className="landing-cta-copy">
                <h2>Your next productive day starts here.</h2>
                <p>
                  Join StudyFlows and bring structure, focus and progress to your studies.
                </p>
                <div className="landing-cta-actions">
                  <Link to="/register" className="landing-button landing-button--large">
                    Get Started
                    <span aria-hidden="true">→</span>
                  </Link>
                  <Link
                    to="/login"
                    className="landing-button landing-button--ghost landing-button--large"
                  >
                    Log in
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-grid">
            <div className="landing-footer-brand">
              <Link to="/" className="landing-wordmark" aria-label="StudyFlows home">
                <span className="landing-logo" aria-hidden="true">
                  S
                </span>
                <span>StudyFlows</span>
              </Link>
              <p>A focused study workspace for notes, quizzes and revision.</p>
            </div>

            <nav className="landing-footer-column" aria-label="Product">
              <h3>Product</h3>
              <div className="landing-footer-links">
                <a href="#features">Features</a>
                <a href="#how-it-works">How it works</a>
                <Link to="/register">Create account</Link>
              </div>
            </nav>

            <nav className="landing-footer-column" aria-label="Study tools">
              <h3>Study tools</h3>
              <div className="landing-footer-links">
                <Link to="/spaces">Subjects</Link>
                <Link to="/revision">Revision</Link>
                <Link to="/exam-plans">Exam plans</Link>
                <Link to="/analytics">Progress</Link>
              </div>
            </nav>

            <nav className="landing-footer-column" aria-label="Account">
              <h3>Account</h3>
              <div className="landing-footer-links">
                <Link to="/login">Log in</Link>
                <Link to="/dashboard">Dashboard</Link>
              </div>
            </nav>
          </div>

          <div className="landing-footer-bottom">
            <span>© {year} StudyFlows</span>
            <span>Built for focused, consistent study.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
