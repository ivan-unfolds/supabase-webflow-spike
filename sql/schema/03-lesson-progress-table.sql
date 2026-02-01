-- Lesson Progress Table Schema
-- Tracks user progress through lessons/courses

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  course_slug text NOT NULL,
  module_slug text NOT NULL,
  lesson_slug text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  last_viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT lesson_progress_pkey PRIMARY KEY (id),
  CONSTRAINT lesson_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
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