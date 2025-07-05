-- Add comment_attachments table
CREATE TABLE IF NOT EXISTS public.comment_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for comment attachments
CREATE INDEX IF NOT EXISTS idx_comment_attachments_comment_id ON public.comment_attachments(comment_id);

-- Enable RLS for comment attachments
ALTER TABLE public.comment_attachments ENABLE ROW LEVEL SECURITY;

-- Create policy for comment attachments
CREATE POLICY "Allow all operations on comment attachments" ON public.comment_attachments FOR ALL USING (true);

-- Create storage bucket for comment attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('comment-attachments', 'comment-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for comment attachments
CREATE POLICY "Allow all operations on comment attachments" ON storage.objects
FOR ALL USING (bucket_id = 'comment-attachments'); 