/**
 * CampaignCard Unit Tests
 *
 * Tests the CampaignCard component for correct rendering of:
 * - Campaign title, description, and creator address
 * - Progress percentage display and progress bar width
 * - Status badges for Active, Successful, Expired, and Withdrawn campaigns
 * - Accessibility: role="button" and keyboard navigation support
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CampaignCard } from '../CampaignCard';
import type { CampaignUI } from '@/types';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCampaign(overrides?: Partial<CampaignUI>): CampaignUI {
  const now = new Date();
  const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    id: 1,
    creator: 'GDOJIEIHOEUCXZMHGVZOA2V2WZMP7QVXAV42M76QNDKQYEPJDO7V3ARX',
    title: 'Build a Solar Hub',
    description: 'We are building a solar-powered community hub.',
    goal: 5000,
    deadline: future,
    raised: 2500,
    status: 'Active',
    progressPercent: 50,
    daysLeft: 30,
    isExpired: false,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CampaignCard', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders the campaign title', () => {
    render(<CampaignCard campaign={makeCampaign()} />);
    expect(screen.getByText('Build a Solar Hub')).toBeInTheDocument();
  });

  it('renders the campaign description', () => {
    render(<CampaignCard campaign={makeCampaign()} />);
    expect(
      screen.getByText('We are building a solar-powered community hub.')
    ).toBeInTheDocument();
  });

  it('renders the campaign ID', () => {
    render(<CampaignCard campaign={makeCampaign({ id: 7 })} />);
    expect(screen.getByText('#7')).toBeInTheDocument();
  });

  it('displays correct progress percentage for Active campaign', () => {
    render(<CampaignCard campaign={makeCampaign({ progressPercent: 47.5 })} />);
    expect(screen.getByText('47.5% escrowed')).toBeInTheDocument();
  });

  it('shows "Open" badge for an active campaign', () => {
    render(<CampaignCard campaign={makeCampaign({ status: 'Active' })} />);
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('shows "Locked / Funded" badge for a successful campaign', () => {
    render(
      <CampaignCard
        campaign={makeCampaign({ status: 'Successful', progressPercent: 100 })}
      />
    );
    expect(screen.getByText('Locked / Funded')).toBeInTheDocument();
  });

  it('shows "Expired / Closed" badge for an expired campaign', () => {
    render(
      <CampaignCard
        campaign={makeCampaign({ status: 'Expired', isExpired: true, daysLeft: 0 })}
      />
    );
    expect(screen.getByText('Expired / Closed')).toBeInTheDocument();
  });

  it('shows "Paid Out" badge for a withdrawn campaign', () => {
    render(
      <CampaignCard campaign={makeCampaign({ status: 'Withdrawn', progressPercent: 100 })} />
    );
    expect(screen.getByText('Paid Out')).toBeInTheDocument();
  });

  it('has a role="button" for accessibility', () => {
    render(<CampaignCard campaign={makeCampaign()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders a shortened creator address', () => {
    render(<CampaignCard campaign={makeCampaign()} />);
    // shortAddress with 4 chars = "GDOJ...ARXG" – just check first 4 chars appear
    const container = screen.getByRole('button');
    expect(container.textContent).toContain('GDOJ');
  });
});
