import { useEffect, useState, type FormEvent } from 'react';
import { aiAccessApi, getErrorMessage } from '../api';
import type { AiAccessGrant, AiAccessGrantStatus, AiAccessStatus } from '../api/types';
import { Button } from './Button';
import { Card } from './Card';
import { ErrorBanner, Notice } from './ErrorBanner';
import '../aiAccess.css';

const STATUS_LABELS: Record<AiAccessGrantStatus, string> = {
  registered: 'Registered',
  pending: 'Pending sign-up',
  revoked: 'Revoked',
};

const statusClass = (status: AiAccessGrantStatus): string => {
  if (status === 'registered') {
    return 'badge success';
  }
  if (status === 'revoked') {
    return 'badge danger';
  }
  return 'badge status-due';
};

export const AiAccessSettings = () => {
  const [status, setStatus] = useState<AiAccessStatus | null>(null);
  const [grants, setGrants] = useState<AiAccessGrant[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    aiAccessApi
      .status()
      .then(async (accessStatus) => {
        if (!active) {
          return;
        }
        setStatus(accessStatus);
        if (accessStatus.isAdmin) {
          const result = await aiAccessApi.list();
          if (active) {
            setGrants(result);
          }
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(getErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const grantAccess = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = email.trim();
    if (!normalized || submitting) {
      return;
    }
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const grant = await aiAccessApi.grant(normalized);
      setGrants((current) => {
        const existing = current.findIndex((entry) => entry.id === grant.id);
        if (existing === -1) {
          return [grant, ...current];
        }
        return current.map((entry) => (entry.id === grant.id ? grant : entry));
      });
      setEmail('');
      setMessage(`AI assistant access granted to ${grant.email}.`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const revokeAccess = async (grant: AiAccessGrant) => {
    if (
      !window.confirm(
        `Revoke AI assistant access for ${grant.email}? This takes effect immediately.`,
      )
    ) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const updated = await aiAccessApi.revoke(grant.id);
      setGrants((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
      setMessage(`AI assistant access revoked for ${updated.email}.`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  if (loading || !status?.isAdmin) {
    return null;
  }

  return (
    <Card
      title="AI access"
      description="Invite accounts to the Gemini-powered study assistant. Access changes apply immediately."
    >
      <div className="ai-access-settings">
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
        {message ? <Notice>{message}</Notice> : null}

        <p className="muted small-text">
          You are managing access as <strong>{status.email}</strong>. Other accounts need
          an invite for this exact email address.
        </p>

        <form className="ai-access-form" onSubmit={grantAccess}>
          <label className="field grow">
            <span>Student email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="student@university.edu"
              required
            />
          </label>
          <Button type="submit" disabled={submitting || email.trim().length === 0}>
            {submitting ? 'Granting...' : 'Grant access'}
          </Button>
        </form>

        {grants.length === 0 ? (
          <p className="muted small-text">
            No student invites yet. Add an email above to allow Gemini assistant access.
          </p>
        ) : (
          <div className="ai-access-list">
            {grants.map((grant) => (
              <div key={grant.id} className="ai-access-row">
                <div className="ai-access-identity">
                  <strong>{grant.email}</strong>
                  <small>
                    Invited by {grant.invitedBy}
                    {grant.status === 'revoked' && grant.revokedAt
                      ? ` - revoked ${new Date(grant.revokedAt).toLocaleDateString()}`
                      : ''}
                  </small>
                </div>
                <span className={statusClass(grant.status)}>
                  {STATUS_LABELS[grant.status]}
                </span>
                {grant.status !== 'revoked' ? (
                  <Button
                    variant="danger"
                    small
                    onClick={() => void revokeAccess(grant)}
                  >
                    Revoke
                  </Button>
                ) : (
                  <span className="muted small-text">Re-invite to restore</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
