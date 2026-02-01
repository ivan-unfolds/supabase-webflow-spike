-- Lesson Progress Table Schema
-- Tracks user progress through lessons/courses

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  course_slug text,
  module_slug text,
  lesson_slug text NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  last_viewed_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_slug)
);

-- Enable Row Level Security
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own progress
CREATE POLICY "lesson_progress_select_own"
  ON public.lesson_progress FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "lesson_progress_insert_own"
  ON public.lesson_progress FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "lesson_progress_update_own"
  ON public.lesson_progress FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "lesson_progress_delete_own"
  ON public.lesson_progress FOR DELETE
  USING (user_id = auth.uid());