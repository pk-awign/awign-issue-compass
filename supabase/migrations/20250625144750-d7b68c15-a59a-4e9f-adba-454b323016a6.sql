
-- Add PIN field to users table
ALTER TABLE public.users ADD COLUMN pin VARCHAR(4);

-- Add constraint to ensure PIN is exactly 4 digits
ALTER TABLE public.users ADD CONSTRAINT users_pin_check CHECK (pin ~ '^[0-9]{4}$');

-- Update existing users to have a default PIN (they can be updated later)
UPDATE public.users SET pin = '0000' WHERE pin IS NULL;

-- Make PIN NOT NULL after setting defaults
ALTER TABLE public.users ALTER COLUMN pin SET NOT NULL;
