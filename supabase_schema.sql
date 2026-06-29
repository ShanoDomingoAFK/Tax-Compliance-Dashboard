-- =====================================================================
-- TAX AND COMPLIANCE DASHBOARD - SUPABASE POSTGRESQL SCHEMA
-- Target Environment: Supabase PostgreSQL (with Row-Level Security)
-- Last Updated: 2026-06-28
-- =====================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. UTILITY FUNCTIONS & TRIGGERS
-- ==========================================

-- Trigger to automatically update the 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 2. USERS & ACCESS CONTROL (PROFILES)
-- ==========================================
-- Links with Supabase Auth schema (auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'editor' CHECK (role IN ('admin', 'editor', 'viewer')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Extended user profiles synced with Supabase Authentication.';

-- Automatically create a profile when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        'editor'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to hook into auth.users creation
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updating profile updated_at
CREATE TRIGGER update_profiles_modtime
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==========================================
-- 3. REFERENCES & MASTER DATA
-- ==========================================

-- VAT Categories
CREATE TABLE IF NOT EXISTS public.vat_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL,
    label VARCHAR(255) NOT NULL,
    kind VARCHAR(50) NOT NULL CHECK (kind IN ('purchase', 'sale', 'zero-rated', 'exempt', 'other')),
    rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0000, -- e.g. 0.1200 for 12%
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id)
);

CREATE TRIGGER update_vat_categories_modtime
    BEFORE UPDATE ON public.vat_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Alphanumeric Tax Codes (ATC) Master
CREATE TABLE IF NOT EXISTS public.atc_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    atc_code VARCHAR(20) UNIQUE NOT NULL,
    rate NUMERIC(5, 4) NOT NULL, -- e.g. 0.0100 (1%), 0.0200 (2%), 0.0500 (5%), 0.1500 (15%)
    description TEXT NOT NULL,
    source VARCHAR(100) DEFAULT 'BIR',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id)
);

CREATE TRIGGER update_atc_master_modtime
    BEFORE UPDATE ON public.atc_master
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Supplier / Customer Master (Contact Directory)
CREATE TABLE IF NOT EXISTS public.supplier_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tin VARCHAR(50) UNIQUE NOT NULL,
    registered_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(100),
    first_name VARCHAR(100),
    middle_name VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    zip VARCHAR(20),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id)
);

CREATE TRIGGER update_supplier_master_modtime
    BEFORE UPDATE ON public.supplier_master
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==========================================
-- 4. DISBURSEMENTS / PURCHASE TRANSACTIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.purchase_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_name VARCHAR(255) NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    tin VARCHAR(50) NOT NULL,
    cv_number VARCHAR(100) NOT NULL, -- Check Voucher Number
    invoice_number VARCHAR(100), -- Invoice Number
    transaction_date DATE NOT NULL,
    description TEXT,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    vatable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    non_vatable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    vat_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    vat_category VARCHAR(10) REFERENCES public.vat_categories(code),
    vat_reg_type VARCHAR(20) DEFAULT 'VAT-reg' CHECK (vat_reg_type IN ('VAT-reg', 'Non-VAT')),
    ewt_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    atc_code VARCHAR(20) REFERENCES public.atc_master(atc_code),
    manual_status VARCHAR(50) DEFAULT 'unreviewed' CHECK (manual_status IN ('unreviewed', 'ok', 'warn', 'err', 'journal', 'adjusting')),
    review_note TEXT,
    last_reviewed_at TIMESTAMPTZ,
    last_reviewed_by UUID REFERENCES public.profiles(id),
    accounting_title VARCHAR(255),
    bank_account VARCHAR(255),
    supplier_manual_override BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id)
);

CREATE TRIGGER update_purchase_transactions_modtime
    BEFORE UPDATE ON public.purchase_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==========================================
-- 5. REVENUE / SALES TRANSACTIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.sales_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_name VARCHAR(255) NOT NULL, -- Customer / Payer Name
    customer_name VARCHAR(255) NOT NULL,
    tin VARCHAR(50) NOT NULL,
    cv_number VARCHAR(100) NOT NULL, -- Sales Invoice / Official Receipt Reference
    invoice_number VARCHAR(100), -- Sales Invoice Number
    transaction_date DATE NOT NULL,
    description TEXT,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    vatable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    non_vatable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    vat_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    vat_category VARCHAR(10) REFERENCES public.vat_categories(code),
    vat_reg_type VARCHAR(20) DEFAULT 'VAT-reg' CHECK (vat_reg_type IN ('VAT-reg', 'Non-VAT')),
    cwt_withheld_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00, -- Withholding Tax from Client
    atc_code VARCHAR(20) REFERENCES public.atc_master(atc_code),
    manual_status VARCHAR(50) DEFAULT 'unreviewed' CHECK (manual_status IN ('unreviewed', 'ok', 'warn', 'err', 'journal', 'adjusting')),
    review_note TEXT,
    last_reviewed_at TIMESTAMPTZ,
    last_reviewed_by UUID REFERENCES public.profiles(id),
    accounting_title VARCHAR(255) DEFAULT 'Revenues',
    bank_account VARCHAR(255),
    customer_manual_override BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id)
);

CREATE TRIGGER update_sales_transactions_modtime
    BEFORE UPDATE ON public.sales_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==========================================
-- 6. GENERAL LEDGER BALANCE LINES (INPUT / OUTPUT / EWT / CWT)
-- ==========================================

-- Input VAT Ledger
CREATE TABLE IF NOT EXISTS public.input_vat_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cv_number VARCHAR(100) NOT NULL,
    supplier_name VARCHAR(255),
    entry_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    account_code_name VARCHAR(255) DEFAULT 'Input VAT',
    reference_code VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id)
);

CREATE TRIGGER update_input_vat_ledger_modtime
    BEFORE UPDATE ON public.input_vat_ledger
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Purchase EWT Ledger
CREATE TABLE IF NOT EXISTS public.ewt_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cv_number VARCHAR(100) NOT NULL,
    supplier_name VARCHAR(255),
    entry_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    account_code_name VARCHAR(255) DEFAULT 'Expanded Withholding Tax Payable',
    reference_code VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id)
);

CREATE TRIGGER update_ewt_ledger_modtime
    BEFORE UPDATE ON public.ewt_ledger
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Output VAT Ledger (Sales Side)
CREATE TABLE IF NOT EXISTS public.output_vat_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cv_number VARCHAR(100) NOT NULL, -- Maps to sales invoice / OR ref
    customer_name VARCHAR(255),
    entry_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    account_code_name VARCHAR(255) DEFAULT 'Output VAT',
    reference_code VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id)
);

CREATE TRIGGER update_output_vat_ledger_modtime
    BEFORE UPDATE ON public.output_vat_ledger
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Creditable Withholding Tax (CWT) Ledger (Sales Side)
CREATE TABLE IF NOT EXISTS public.cwt_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cv_number VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255),
    entry_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    account_code_name VARCHAR(255) DEFAULT 'Creditable Withholding Tax',
    reference_code VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id)
);

CREATE TRIGGER update_cwt_ledger_modtime
    BEFORE UPDATE ON public.cwt_ledger
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==========================================
-- 7. BIR COMPLIANCE EXPORTS & RETENTION
-- ==========================================
CREATE TABLE IF NOT EXISTS public.bir_compliance_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_type VARCHAR(50) NOT NULL CHECK (form_type IN ('1601-EQ', '2550-Q', 'SLSP-Sales', 'SLSP-Purchases', 'MAP')),
    reporting_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM (e.g. "2026-06")
    reporting_quarter INTEGER CHECK (reporting_quarter IN (1, 2, 3, 4)),
    file_name VARCHAR(255) NOT NULL,
    file_format VARCHAR(10) DEFAULT 'DAT' CHECK (file_format IN ('DAT', 'XLSX', 'PDF', 'CSV', 'XML')),
    record_count INTEGER NOT NULL DEFAULT 0,
    aggregate_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    aggregate_tax NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    export_status VARCHAR(50) DEFAULT 'completed' CHECK (export_status IN ('pending', 'completed', 'submitted', 'archived')),
    download_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);


-- ==========================================
-- 8. AUDIT LOG / ACTIVITY TRAIL
-- ==========================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL, -- e.g. 'INSERT', 'UPDATE', 'DELETE', 'EXPORT'
    table_name VARCHAR(100) NOT NULL, -- e.g. 'purchase_transactions', 'supplier_master'
    record_id UUID NOT NULL,
    description TEXT,
    previous_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for fast search and audits
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at);

-- Reusable function to trigger row changes auditing
CREATE OR REPLACE FUNCTION public.audit_table_row_change()
RETURNS TRIGGER AS $$
DECLARE
    curr_user_id UUID;
    prev_json JSONB := NULL;
    new_json JSONB := NULL;
    rec_id UUID;
BEGIN
    -- Extract active user from Supabase auth session context
    BEGIN
        curr_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        curr_user_id := NULL;
    END;

    IF (TG_OP = 'DELETE') THEN
        prev_json := to_jsonb(OLD);
        rec_id := COALESCE((prev_json->>'id')::UUID, NULL);
    ELSIF (TG_OP = 'UPDATE') THEN
        prev_json := to_jsonb(OLD);
        new_json := to_jsonb(NEW);
        rec_id := COALESCE((new_json->>'id')::UUID, NULL);
    ELSIF (TG_OP = 'INSERT') THEN
        new_json := to_jsonb(NEW);
        rec_id := COALESCE((new_json->>'id')::UUID, NULL);
    END IF;

    INSERT INTO public.audit_logs (user_id, action_type, table_name, record_id, description, previous_state, new_state)
    VALUES (
        curr_user_id,
        TG_OP,
        TG_TABLE_NAME,
        rec_id,
        'Audited ' || TG_OP || ' action on ' || TG_TABLE_NAME,
        prev_json,
        new_json
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Enable auditing on transactions & reference masters
CREATE TRIGGER audit_purchase_txn_changes AFTER INSERT OR UPDATE OR DELETE ON public.purchase_transactions FOR EACH ROW EXECUTE FUNCTION public.audit_table_row_change();
CREATE TRIGGER audit_sales_txn_changes AFTER INSERT OR UPDATE OR DELETE ON public.sales_transactions FOR EACH ROW EXECUTE FUNCTION public.audit_table_row_change();
CREATE TRIGGER audit_supplier_changes AFTER INSERT OR UPDATE OR DELETE ON public.supplier_master FOR EACH ROW EXECUTE FUNCTION public.audit_table_row_change();


-- ==========================================
-- 9. PERFORMANCE OPTIMIZATION INDEXES
-- ==========================================
-- Purchase transactions searching and filtering indexes
CREATE INDEX IF NOT EXISTS idx_purchases_cv ON public.purchase_transactions(cv_number);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON public.purchase_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchase_transactions(manual_status);
CREATE INDEX IF NOT EXISTS idx_purchases_deleted ON public.purchase_transactions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_purchases_tin ON public.purchase_transactions(tin);

-- Sales transactions searching and filtering indexes
CREATE INDEX IF NOT EXISTS idx_sales_cv ON public.sales_transactions(cv_number);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales_transactions(manual_status);
CREATE INDEX IF NOT EXISTS idx_sales_deleted ON public.sales_transactions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_sales_tin ON public.sales_transactions(tin);

-- Ledger table lookup performance indexes
CREATE INDEX IF NOT EXISTS idx_ledger_vat_cv ON public.input_vat_ledger(cv_number) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ledger_ewt_cv ON public.ewt_ledger(cv_number) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ledger_ovat_cv ON public.output_vat_ledger(cv_number) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ledger_cwt_cv ON public.cwt_ledger(cv_number) WHERE is_deleted = FALSE;


-- ==========================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable Row Level Security on all active tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vat_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atc_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.input_vat_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ewt_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.output_vat_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cwt_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bir_compliance_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- A. Policies for Profiles
-- ------------------------------------------
CREATE POLICY "Allow public select of active profile names" ON public.profiles
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Allow users to update own profile info" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- ------------------------------------------
-- B. Policies for Reference / Master Data (ATC, VAT, Suppliers)
-- ------------------------------------------
CREATE POLICY "Allow read-only select of master references to authenticated users" ON public.vat_categories
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Allow read-only select of ATC rules to authenticated users" ON public.atc_master
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Allow reading active suppliers to authenticated users" ON public.supplier_master
    FOR SELECT TO authenticated USING (is_deleted = FALSE);

-- Write/Modify policies on masters restricted to Administrators and Editors
CREATE POLICY "Allow write/edit to master databases for Admin/Editors" ON public.supplier_master
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')
        )
    );

CREATE POLICY "Allow write/edit to VAT categories for Admin/Editors" ON public.vat_categories
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')
        )
    );

CREATE POLICY "Allow write/edit to ATC codes for Admin/Editors" ON public.atc_master
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')
        )
    );

-- ------------------------------------------
-- C. Policies for Transactions and Ledger Records (Full CRUD for Authenticated users)
-- ------------------------------------------
CREATE POLICY "Allow CRUD on purchases to authenticated staff" ON public.purchase_transactions
    FOR ALL TO authenticated
    USING (is_deleted = FALSE OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Allow CRUD on sales to authenticated staff" ON public.sales_transactions
    FOR ALL TO authenticated
    USING (is_deleted = FALSE OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Allow CRUD on Input VAT ledger lines" ON public.input_vat_ledger
    FOR ALL TO authenticated USING (is_deleted = FALSE);

CREATE POLICY "Allow CRUD on EWT ledger lines" ON public.ewt_ledger
    FOR ALL TO authenticated USING (is_deleted = FALSE);

CREATE POLICY "Allow CRUD on Output VAT ledger lines" ON public.output_vat_ledger
    FOR ALL TO authenticated USING (is_deleted = FALSE);

CREATE POLICY "Allow CRUD on CWT ledger lines" ON public.cwt_ledger
    FOR ALL TO authenticated USING (is_deleted = FALSE);

CREATE POLICY "Allow CRUD on BIR filings history" ON public.bir_compliance_exports
    FOR ALL TO authenticated USING (TRUE);

-- ------------------------------------------
-- D. Policies for Audit Logs (Read-only for Auditors/Admins)
-- ------------------------------------------
CREATE POLICY "Allow read audit trail to system admins" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );


-- ==========================================
-- 11. BASE DATA SEEDING (SAMPLE RECORDS)
-- ==========================================

-- Seed default VAT categories
INSERT INTO public.vat_categories (code, label, kind, rate, status) VALUES
('S', 'Services (12% VAT)', 'sale', 0.1200, 'active'),
('G', 'Goods purchased (12% VAT)', 'purchase', 0.1200, 'active'),
('S-Pur', 'Services purchased (12% VAT)', 'purchase', 0.1200, 'active'),
('ZE', 'Zero-Rated Transactions (0% VAT)', 'sale', 0.0000, 'active'),
('E', 'Exempt Transactions', 'purchase', 0.0000, 'active')
ON CONFLICT (code) DO NOTHING;

-- Seed default ATC Codes
INSERT INTO public.atc_master (atc_code, rate, description, source, status) VALUES
('WC 158', 0.0100, 'Withholding tax on payments to general engineering contractors (1%)', 'BIR', 'active'),
('WC 160', 0.0200, 'Withholding tax on professional/consulting fees (2%)', 'BIR', 'active'),
('WC 100', 0.0500, 'Withholding tax on rental space/commercial real estate (5%)', 'BIR', 'active'),
('WC 120', 0.1000, 'Withholding tax on professional fees / medical clinics (10%)', 'BIR', 'active'),
('WC 140', 0.1500, 'Withholding tax on distributions or other specialized items (15%)', 'BIR', 'active')
ON CONFLICT (atc_code) DO NOTHING;

-- Seed some demo Suppliers / Customers
INSERT INTO public.supplier_master (tin, registered_name, address, city, zip, status) VALUES
('555-555-555-000', 'Acme Sales Corp', '123 Innovation Drive, Bonifacio Global City', 'Taguig City', '1634', 'active'),
('666-666-666-000', 'Globex Consulting Ltd', 'Penthouse A, Enterprise Center, Ayala Ave', 'Makati City', '1226', 'active'),
('777-777-777-000', 'Initech Trading Corp', 'Suite 404, Cyberone Building, Eastwood', 'Quezon City', '1110', 'active'),
('111-222-333-000', 'Meralco Power Distribution', 'Meralco Avenue, Ortigas Center', 'Pasig City', '1600', 'active'),
('444-555-666-000', 'PLDT Enterprise Solutions', 'Ramon Cojuangco Building, Makati Ave', 'Makati City', '1200', 'active')
ON CONFLICT (tin) DO NOTHING;
