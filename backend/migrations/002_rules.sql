CREATE TABLE IF NOT EXISTS rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    host_prefix TEXT,
    url_prefix TEXT,
    path_prefix TEXT,
    title_contains TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rule_tags (
    rule_id UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (rule_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_rules_host_prefix ON rules(host_prefix);
CREATE INDEX IF NOT EXISTS idx_rules_url_prefix ON rules(url_prefix);
CREATE INDEX IF NOT EXISTS idx_rules_path_prefix ON rules(path_prefix);
CREATE INDEX IF NOT EXISTS idx_rules_title_contains ON rules(title_contains);
CREATE INDEX IF NOT EXISTS idx_rule_tags_rule ON rule_tags(rule_id);
