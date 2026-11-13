import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { ThemeSelector } from '../components/ThemeSelector';
import { useTheme } from '../theme/ThemeContext';
import '../account.css';

export const SettingsPage = () => {
  const { reduceMotion, setReduceMotion } = useTheme();

  return (
    <div className="stack large">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Manage how StudyFlows looks and feels on this device."
      />

      <div className="split-grid">
        <div className="stack large">
          <Card title="Appearance" description="Choose a theme for the StudyFlows interface.">
            <ThemeSelector />
            <p className="footnote">
              Your choice is saved in this browser and applies immediately.
            </p>
          </Card>

          <Card
            title="Motion"
            description="Reduce visual movement across the app. This preference is saved on this device."
          >
            <label className="settings-toggle">
              <span className="settings-toggle-copy">
                <strong>Reduce motion</strong>
                <small>Minimize animations and transitions.</small>
              </span>
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={(event) => setReduceMotion(event.target.checked)}
              />
              <span className="settings-toggle-track" aria-hidden="true">
                <span className="settings-toggle-thumb" />
              </span>
            </label>
          </Card>
        </div>

        <div className="stack large">
          <Card
            title="Study preferences"
            description="Control your session length, breaks, and weekly availability."
          >
            <p className="muted">
              These preferences live on the Study Availability page so your plan and revision
              reminders stay in sync.
            </p>
            <Link className="button secondary" to="/availability">
              Open study preferences
            </Link>
          </Card>

          <Card
            title="Account"
            description="Review the details attached to your signed-in account."
          >
            <p className="muted">
              Your name and email are currently managed by the read-only account API.
            </p>
            <Link className="button secondary" to="/profile">
              View profile
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
};
