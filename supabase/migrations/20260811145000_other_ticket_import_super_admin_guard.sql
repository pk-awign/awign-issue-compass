-- Migration: Enforce Super Admin on Other Tickets CSV import RPC
-- Date: 2026-08-11
--
-- Reuses public.users.role (existing application role model).
-- Does not introduce a new permission system.
-- Safe to apply after 20260811140000_other_ticket_import_batches.sql.

CREATE OR REPLACE FUNCTION public.import_other_tickets_csv(
    p_file_name TEXT,
    p_file_hash TEXT,
    p_uploaded_by UUID,
    p_unique_ticket_count INTEGER,
    p_rows JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_id UUID;
    v_batch_id UUID;
    v_row_count INTEGER;
    v_imported INTEGER;
    v_offset INTEGER;
    v_chunk INTEGER;
    v_batch_size CONSTANT INTEGER := 500;
BEGIN
    IF p_file_name IS NULL OR length(trim(p_file_name)) = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_FILE_NAME',
            'message', 'File name is required'
        );
    END IF;

    IF p_file_hash IS NULL OR length(trim(p_file_hash)) = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_FILE_HASH',
            'message', 'File hash is required'
        );
    END IF;

    IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_ROWS',
            'message', 'Rows payload must be a JSON array'
        );
    END IF;

    v_row_count := jsonb_array_length(p_rows);
    IF v_row_count = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'NO_ROWS',
            'message', 'No rows to import'
        );
    END IF;

    -- Reuse public.users.role (application auth model). No service-role in clients.
    IF p_uploaded_by IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'UNAUTHORIZED',
            'message', 'Only Super Admins can import Other Tickets CSV.'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = p_uploaded_by
          AND u.role = 'super_admin'
          AND u.is_active = true
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'UNAUTHORIZED',
            'message', 'Only Super Admins can import Other Tickets CSV.'
        );
    END IF;

    -- Duplicate file protection (successful imports only)
    SELECT id INTO v_existing_id
    FROM public.other_ticket_import_batches
    WHERE file_hash = p_file_hash
      AND status = 'succeeded'
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'DUPLICATE_FILE',
            'message', 'This CSV has already been imported.',
            'batch_id', v_existing_id
        );
    END IF;

    INSERT INTO public.other_ticket_import_batches (
        file_name,
        file_hash,
        uploaded_by,
        total_rows,
        imported_rows,
        unique_ticket_count,
        status
    ) VALUES (
        trim(p_file_name),
        trim(p_file_hash),
        p_uploaded_by,
        v_row_count,
        0,
        COALESCE(p_unique_ticket_count, 0),
        'pending'
    )
    RETURNING id INTO v_batch_id;

    -- Batched insert (500 rows per statement) inside one transaction.
    -- One DB row per JSON element — no grouping by ticket_number.
    v_imported := 0;
    v_offset := 0;
    WHILE v_offset < v_row_count LOOP
        INSERT INTO public.other_tickets (
            ticket_number,
            issue_category,
            description,
            status,
            created_at,
            resource_id,
            category,
            cx_owner,
            user_name,
            exam_date,
            shift,
            role,
            type_of_exam,
            attendance_copy_available,
            link_to_attendance_copy,
            assignee,
            tc_code,
            internal_remark_1,
            assignee_status,
            cx_status,
            internal_remark_2,
            import_batch_id
        )
        SELECT
            trim(row_data->>'ticket_number'),
            trim(row_data->>'issue_category'),
            COALESCE(row_data->>'description', ''),
            (trim(row_data->>'status'))::public.ticket_status_new,
            COALESCE((row_data->>'created_at')::timestamptz, NOW()),
            COALESCE(trim(row_data->>'resource_id'), ''),
            NULLIF(trim(row_data->>'category'), ''),
            NULLIF(trim(row_data->>'cx_owner'), ''),
            NULLIF(trim(row_data->>'user_name'), ''),
            CASE
                WHEN NULLIF(trim(row_data->>'exam_date'), '') IS NULL THEN NULL
                ELSE (trim(row_data->>'exam_date'))::date
            END,
            NULLIF(trim(row_data->>'shift'), ''),
            NULLIF(trim(row_data->>'role'), ''),
            NULLIF(trim(row_data->>'type_of_exam'), ''),
            NULLIF(trim(row_data->>'attendance_copy_available'), ''),
            NULLIF(trim(row_data->>'link_to_attendance_copy'), ''),
            NULLIF(trim(row_data->>'assignee'), ''),
            NULLIF(trim(row_data->>'tc_code'), ''),
            NULLIF(trim(row_data->>'internal_remark_1'), ''),
            NULLIF(trim(row_data->>'assignee_status'), ''),
            NULLIF(trim(row_data->>'cx_status'), ''),
            NULLIF(trim(row_data->>'internal_remark_2'), ''),
            v_batch_id
        FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS t(row_data, ord)
        WHERE t.ord > v_offset
          AND t.ord <= v_offset + v_batch_size;

        GET DIAGNOSTICS v_chunk = ROW_COUNT;
        v_imported := v_imported + v_chunk;
        v_offset := v_offset + v_batch_size;
    END LOOP;

    UPDATE public.other_ticket_import_batches
    SET
        imported_rows = v_imported,
        status = 'succeeded',
        error_message = NULL
    WHERE id = v_batch_id;

    RETURN jsonb_build_object(
        'success', true,
        'code', 'IMPORTED',
        'message', 'Import succeeded',
        'batch_id', v_batch_id,
        'file_name', trim(p_file_name),
        'imported_rows', v_imported,
        'unique_ticket_count', COALESCE(p_unique_ticket_count, 0),
        'uploaded_at', NOW()
    );

EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'DUPLICATE_FILE',
            'message', 'This CSV has already been imported.'
        );
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'IMPORT_FAILED',
            'message', SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION public.import_other_tickets_csv IS
  'Atomically imports Other Tickets CSV rows. Requires p_uploaded_by to be an active super_admin in public.users.';
