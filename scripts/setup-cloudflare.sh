#!/bin/bash
set -e

# -----------------------------------------------------------------------------
# setup-cloudflare.sh
# Creates a Cloudflare D1 database and writes the config into app/wrangler.toml.
# Run from the root of your forked humanlayer-scaffolding repo.
# Requires: wrangler installed and authenticated (wrangler login)
# -----------------------------------------------------------------------------

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/app"
WRANGLER_TOML="$APP_DIR/wrangler.toml"

echo ""
echo "================================"
echo " Cloudflare D1 setup"
echo "================================"
echo ""

# Resolve wrangler: prefer local install, fall back to global
if [ -f "$APP_DIR/node_modules/.bin/wrangler" ]; then
  WRANGLER="$APP_DIR/node_modules/.bin/wrangler"
elif command -v wrangler &> /dev/null; then
  WRANGLER="wrangler"
else
  echo "Error: wrangler not found. Run scripts/setup-app.sh first, or install globally with: npm install -g wrangler"
  exit 1
fi

# Check app/ exists
if [ ! -d "$APP_DIR" ]; then
  echo "Error: app/ directory not found. Run scripts/setup-app.sh first."
  exit 1
fi

# Prompt for app and DB names
read -p "Enter your app name (e.g. my-app): " APP_NAME
read -p "Enter your D1 database name (e.g. my-app-db): " DB_NAME

echo ""
echo "Logging in to Cloudflare (if not already)..."
$WRANGLER whoami 2>/dev/null || $WRANGLER login

echo ""
echo "Creating D1 database: $DB_NAME..."
DB_OUTPUT=$($WRANGLER d1 create "$DB_NAME" 2>&1)
echo "$DB_OUTPUT"

# Extract the database_id from wrangler output
DB_ID=$(echo "$DB_OUTPUT" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)

if [ -z "$DB_ID" ]; then
  echo ""
  echo "Could not automatically extract database ID from wrangler output."
  read -p "Please enter the database_id manually: " DB_ID
fi

DEPLOY_WORKFLOW="$ROOT_DIR/.github/workflows/deploy.yml"

echo ""
echo "Writing wrangler.toml..."

cat > "$WRANGLER_TOML" <<EOF
name = "$APP_NAME"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".svelte-kit/cloudflare"

[[d1_databases]]
binding = "DB"
database_name = "$DB_NAME"
database_id = "$DB_ID"
migrations_dir = "migrations"
EOF

# Update deploy.yml placeholders if the file exists
if [ -f "$DEPLOY_WORKFLOW" ]; then
  echo ""
  echo "Updating .github/workflows/deploy.yml with app and DB names..."
  sed -i.bak "s/YOUR_DB_NAME/$DB_NAME/g" "$DEPLOY_WORKFLOW"
  sed -i.bak "s/YOUR_PROJECT_NAME/$APP_NAME/g" "$DEPLOY_WORKFLOW"
  rm -f "$DEPLOY_WORKFLOW.bak"
else
  echo ""
  echo "Note: .github/workflows/deploy.yml not found — run scripts/setup-app.sh first to copy it."
  echo "Then manually replace YOUR_DB_NAME with '$DB_NAME' and YOUR_PROJECT_NAME with '$APP_NAME'."
fi

echo ""
echo "================================"
echo " Cloudflare setup complete!"
echo "================================"
echo ""
echo "wrangler.toml written to: $WRANGLER_TOML"
echo ""
echo "Next steps:"
echo "  1. Add these secrets to your GitHub repo (Settings → Secrets → Actions):"
echo "     - CLOUDFLARE_API_TOKEN"
echo "     - CLOUDFLARE_ACCOUNT_ID"
echo "     - CLOUDFLARE_DATABASE_ID  (your DB ID: $DB_ID)"
echo "     - CLOUDFLARE_D1_TOKEN"
echo ""
echo "  2. Deploy via GitHub Actions (sole deployment mechanism):"
echo "     - The Cloudflare Pages project is created automatically on first deploy"
echo "     - Do NOT connect your GitHub repo in the Cloudflare dashboard"
echo "       (that enables a duplicate direct Git integration build)"
echo "     - Deploys are triggered by publishing a GitHub release"
echo "         Use /cut-a-release to run the full release workflow"
echo ""
echo "  3. Apply migrations to production:"
echo "     cd app && npm run db:migrate:remote"
echo ""
echo "  4. To deploy, publish a GitHub release:"
echo "     Use the /cut-a-release skill — it handles versioning, changelog,"
echo "     and release creation, which triggers the deploy pipeline automatically."
echo ""
