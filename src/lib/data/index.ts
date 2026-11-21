import { cookies } from 'next/headers';
import {
  Profile,
  Project,
  AspectScores,
  ActivityItem,
  CommonProjectCourse,
} from '@/types';
import {
  mockProfile,
  mockProjects,
  mockScores,
  mockActivity,
  mockCommonProjects,
} from '@/lib/mock';
import { getCurrentUser } from '@/lib/auth/user';
import type { LearningCertificate, LearningSummary } from '@/types/learning';
import { certificateByCode, learningSummaries, listCertificates } from '@/lib/brain/service';
import { demoHasCert, demoSummaries, sampleCertificate, SAMPLE_CERT_CODE } from '@/lib/brain/demo';
import { createClient } from '@/lib/supabase/server';

/**
 * Data Access Layer (DAL)
 * Reads session from Firebase / mock cookies or Supabase;
 * gracefully falls back to realistic mock data.
 */

export async function getProfile(): Promise<Profile> {
  try {
    const user = await getCurrentUser();
    if (user?.demo) {
      const slug = user.uid.slice('demo:'.length);
      return { ...mockProfile, id: user.uid, username: slug, full_name: user.name || slug };
    }
    if (user) {
      const username = user.email ? user.email.split('@')[0] : (user.name || 'developer').toLowerCase().replace(/\s+/g, '_');

      // Prefer a saved profile row if one exists
      try {
        const supabase = createClient();
        const { data: row } = await supabase.from('profiles').select('*').eq('id', user.uid).maybeSingle();
        if (row) return row as Profile;
      } catch {
        // fall through to the token-derived profile
      }

      return {
        id: user.uid,
        username,
        full_name: user.name || username,
        avatar_url: user.picture,
        email: user.email,
        headline: null,
        bio: null,
        // Set by /api/github/save-token when GitHub was linked at sign-in or from the import page
        github_username: cookies().get('projust_gh_user')?.value || null,
        github_connected: Boolean(cookies().get('projust_gh_token')?.value),
        linkedin_url: null,
        created_at: new Date().toISOString(),
      };
    }
  } catch {
    // ignore
  }

  return mockProfile;
}

export async function getProjects(): Promise<Project[]> {
  try {
    const user = await getCurrentUser();
    // Sample data is only for demo mode; a real account sees its own (possibly empty) list.
    if (!user || user.demo) return mockProjects;
    const userId = user.uid;

    const supabase = createClient();
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (projects && projects.length > 0) {
      return projects.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        repo_url: p.repo_url,
        repo_full_name: p.repo_full_name,
        commit_sha: p.commit_sha,
        ownership_pct: p.ownership_pct || 100,
        is_fork: p.is_fork || false,
        status: p.status,
        summary: p.summary?.oneLiner || p.status_detail || 'Imported GitHub repository',
        concepts_count: p.file_count || 6,
        created_at: p.created_at,
      }));
    }
    return [];
  } catch {
    // fallback
  }

  return mockProjects;
}

export async function getScores(): Promise<AspectScores> {
  return mockScores;
}

/** Projects that have a course (any status). Dashboard uses the count. */
export async function getCourses(): Promise<LearningSummary[]> {
  return (await getLearningSummaries()).filter((s) => s.course);
}

/** One learning summary per project: concepts, course progress, latest quiz attempt, certificate. */
export async function getLearningSummaries(): Promise<LearningSummary[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  try {
    if (user.demo) return demoSummaries(user.uid, mockProjects);
    return await learningSummaries(user.uid);
  } catch (err) {
    console.error('getLearningSummaries failed:', err);
    return [];
  }
}

export async function getActivity(): Promise<ActivityItem[]> {
  return mockActivity;
}

export async function getCertificates(): Promise<LearningCertificate[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  try {
    if (user.demo) return demoHasCert(user.uid) ? [sampleCertificate()] : [];
    return await listCertificates(user.uid);
  } catch (err) {
    console.error('getCertificates failed:', err);
    return [];
  }
}

/** Public verification. Only real codes from the database, plus the one labelled sample. */
export async function getCertificateByCode(code: string): Promise<LearningCertificate | null> {
  const c = code.trim().toUpperCase();
  if (c === SAMPLE_CERT_CODE) return sampleCertificate();
  try {
    return await certificateByCode(c);
  } catch (err) {
    console.error('getCertificateByCode failed:', err);
    return null;
  }
}

export interface PublicProfile {
  profile: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    headline: string | null;
    bio: string | null;
    github_username: string | null;
    linkedin_url: string | null;
  };
  certificates: LearningCertificate[];
  sample: boolean;
}

/** Public profile page data. `alexchen` is the labelled sample profile. */
export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const u = username.trim().toLowerCase();
  if (u === 'alexchen') {
    return {
      profile: {
        username: 'alexchen',
        full_name: 'Alex Chen',
        avatar_url: null,
        headline: mockProfile.headline,
        bio: mockProfile.bio,
        github_username: mockProfile.github_username,
        linkedin_url: null,
      },
      certificates: [sampleCertificate()],
      sample: true,
    };
  }
  if (!/^[a-z0-9_-]{3,30}$/.test(u)) return null;
  try {
    const supabase = createClient();
    const { data: row } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, headline, bio, github_username, linkedin_url, public_profile')
      .eq('username', u)
      .maybeSingle();
    if (!row || row.public_profile === false) return null;
    return {
      profile: {
        username: row.username,
        full_name: row.full_name,
        avatar_url: row.avatar_url,
        headline: row.headline,
        bio: row.bio,
        github_username: row.github_username,
        linkedin_url: row.linkedin_url,
      },
      certificates: await listCertificates(row.id),
      sample: false,
    };
  } catch (err) {
    console.error('getPublicProfile failed:', err);
    return null;
  }
}

export async function getCommonProjects(): Promise<CommonProjectCourse[]> {
  return mockCommonProjects;
}
