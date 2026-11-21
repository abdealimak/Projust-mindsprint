import {
  Profile,
  Project,
  AspectScores,
  CourseProgress,
  ActivityItem,
  Certificate,
  CommonProjectCourse,
} from '@/types';
import {
  mockProfile,
  mockProjects,
  mockScores,
  mockCourses,
  mockActivity,
  mockCertificates,
  mockCommonProjects,
} from '@/lib/mock';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

/**
 * Data Access Layer (DAL)
 * Reads session from Firebase / mock cookies or Supabase;
 * gracefully falls back to realistic mock data.
 */

export async function getProfile(): Promise<Profile> {
  try {
    const cookieStore = cookies();
    const userCookie = cookieStore.get('projust_user')?.value;
    const mockCookie = cookieStore.get('projust_mock_user')?.value;

    if (userCookie) {
      try {
        const u = JSON.parse(userCookie);
        const username = u.email ? u.email.split('@')[0] : (u.name || 'developer').toLowerCase().replace(/\s+/g, '_');
        return {
          id: u.uid || 'fb_user',
          username,
          full_name: u.name || username,
          avatar_url: u.picture || null,
          email: u.email || null,
          headline: 'Full-stack Developer',
          bio: 'Building and verifying software projects with Projust.',
          github_username: null,
          github_connected: false,
          linkedin_url: null,
          created_at: new Date().toISOString(),
        };
      } catch {
        // fallback
      }
    }

    if (mockCookie) {
      return {
        ...mockProfile,
        username: mockCookie,
        full_name: mockCookie === 'alexchen' ? 'Alex Chen' : mockCookie,
      };
    }

    // Try Supabase if available
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (profile) return profile as Profile;
      }
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }

  return mockProfile;
}

export async function getProjects(): Promise<Project[]> {
  try {
    const cookieStore = cookies();
    const userCookie = cookieStore.get('projust_user')?.value;
    const mockCookie = cookieStore.get('projust_mock_user')?.value;
    let userId: string | null = null;

    if (userCookie) {
      try {
        userId = JSON.parse(userCookie).uid;
      } catch {
        // ignore
      }
    } else if (mockCookie) {
      userId = mockCookie;
    }

    const supabase = createClient();
    let query = supabase.from('projects').select('*').order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: projects } = await query;

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
  } catch {
    // fallback
  }

  return mockProjects;
}

export async function getScores(): Promise<AspectScores> {
  return mockScores;
}

export async function getCourses(): Promise<CourseProgress[]> {
  return mockCourses;
}

export async function getActivity(): Promise<ActivityItem[]> {
  return mockActivity;
}

export async function getCertificates(): Promise<Certificate[]> {
  return mockCertificates;
}

export async function getCertificateByCode(code: string): Promise<Certificate | null> {
  const match = mockCertificates.find((c) => c.cert_code.toLowerCase() === code.toLowerCase());
  return match || mockCertificates[0];
}

export async function getCommonProjects(): Promise<CommonProjectCourse[]> {
  return mockCommonProjects;
}
