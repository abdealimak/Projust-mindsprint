import React from 'react';
import { Page, PageHeader } from '@/components/layout/PageHeader';
import { HiringClient } from './HiringClient';

export const metadata = { title: 'Hiring tools · Projust' };

/**
 * HR testing tools: build a screening quiz, try it as a candidate, and check a
 * candidate's Projust certificate against your own score bar.
 * Quizzes and rules are saved in this browser only.
 */
export default function HiringPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="For hiring teams"
        title="Test candidates on"
        em="what they actually know."
        description="Build a screening quiz, take it yourself the way a candidate would, and check any Projust certificate against the scores your role needs."
      />
      <HiringClient />
    </Page>
  );
}
