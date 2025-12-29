/*
================== DATA MIGRATION SCRIPT ==================

THIS SCRIPT IS FOR UPGRADING EXISTING DATABASES ONLY.
DO NOT RUN ON A FRESH DATABASE SETUP WITH THE NEW SCHEMA.

This script migrates data from the old `text` fields 
(`toll_collector`, `monitor`) in the `toll_records` table 
to the new `uuid` foreign key fields (`collector_id`, `monitor_id`).

===========================================================
*/

-- Step 1: Add the new columns if they don't already exist.
-- In a transaction to ensure atomicity.
BEGIN;

DO $$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='toll_records' AND column_name='collector_id') THEN
        ALTER TABLE public.toll_records ADD COLUMN collector_id uuid;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='toll_records' AND column_name='monitor_id') THEN
        ALTER TABLE public.toll_records ADD COLUMN monitor_id uuid;
    END IF;
END;
$$;

-- Step 2: Update the new columns by matching names.
-- This assumes the old text columns stored the NAME of the collector/monitor.
-- If it stored the CODE, change `tci.name` to `tci.code` and `mi.name` to `mi.code`.

-- Update collector_id
UPDATE public.toll_records tr
SET collector_id = tci.id
FROM public.toll_collectors_info tci
WHERE tr.toll_collector = tci.name AND tr.collector_id IS NULL;

-- Update monitor_id
UPDATE public.toll_records tr
SET monitor_id = mi.id
FROM public.monitors_info mi
WHERE tr.monitor = mi.name AND tr.monitor_id IS NULL;

-- Step 3: Add foreign key constraints if they don't exist.
-- Note: This might fail if some names in the old text fields did not match anyone.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'toll_records_collector_id_fkey') THEN
        ALTER TABLE public.toll_records
        ADD CONSTRAINT toll_records_collector_id_fkey
        FOREIGN KEY (collector_id) REFERENCES public.toll_collectors_info(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'toll_records_monitor_id_fkey') THEN
        ALTER TABLE public.toll_records
        ADD CONSTRAINT toll_records_monitor_id_fkey
        FOREIGN KEY (monitor_id) REFERENCES public.monitors_info(id) ON DELETE SET NULL;
    END IF;
END;
$$;

COMMIT;

-- Step 4: Manually verify the data migration.
-- Run this query to check the results before dropping the old columns:
-- SELECT id, toll_collector, collector_id, monitor, monitor_id FROM public.toll_records WHERE toll_collector IS NOT NULL OR monitor IS NOT NULL;

-- Step 5: After verification, the old columns can be dropped.
-- It is recommended to do this in a separate, manually-run script after backing up the data.
/*
ALTER TABLE public.toll_records
DROP COLUMN IF EXISTS toll_collector,
DROP COLUMN IF EXISTS monitor;
*/
