export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  headline: string | null;
  bio: string | null;
  github_username: string | null;
  github_connected: boolean;
  linkedin_url: string | null;
  public_profile?: boolean;
  created_at: string;
  updated_at?: string;
}

export type ProjectStatus = 'analyzing' | 'ready' | 'in_progress' | 'completed' | 'failed';

export interface Project {
  id: string;
  user_id: string;
  repo_url: string;
  repo_full_name: string;
  commit_sha?: string;
  ownership_pct: number;
  is_fork: boolean;
  status: ProjectStatus;
  summary: string;
  concepts_count?: number;
  created_at: string;
}

export interface AspectScores {
  concept_understanding: number;
  code_comprehension: number;
  debugging: number;
  architecture_design: number;
  security_best_practices: number;
  ai_collaboration: number;
}

export interface CourseProgress {
  id: string;
  project_id: string;
  project_name: string;
  course_title: string;
  current_subtopic: string;
  completed_subtopics: number;
  total_subtopics: number;
  progress_percent: number;
  last_activity: string;
}

export interface ActivityItem {
  id: string;
  type: 'quiz' | 'certificate' | 'project' | 'course';
  title: string;
  description: string;
  project_name: string;
  timestamp: string;
  score?: number;
  chips?: { label: string; score: number }[];
  cert_id?: string;
}

export interface Certificate {
  id: string;
  cert_code: string;
  project_name: string;
  project_id: string;
  repo_full_name: string;
  recipient_name: string;
  recipient_username: string;
  level: 'Course-verified' | 'Interview-verified';
  issued_at: string;
  updated_at: string;
  scores: AspectScores;
  overall_score: number;
  ownership_pct: number;
  concepts_mastered: { name: string; category: string; strength: 'proficient' | 'advanced' | 'master' }[];
  version: string;
}

export interface CommonProjectCourse {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  tags: string[];
  estimated_hours: number;
  enrolled_count: number;
}
