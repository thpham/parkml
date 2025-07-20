#!/bin/bash

# ParkML Production Deployment Script
# This script sets up the production environment with Dokku and PostgreSQL

set -e

# Configuration
APP_NAME="parkml"
DOKKU_HOST="${DOKKU_HOST:-your-server.com}"
DOKKU_USER="${DOKKU_USER:-dokku}"
DB_NAME="${DB_NAME:-parkml_production}"

echo "🚀 Starting ParkML production deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're on the correct server
if [ "$1" = "server" ]; then
    print_status "Running server-side deployment setup..."

    # Create the Dokku app if it doesn't exist
    if ! dokku apps:exists "$APP_NAME"; then
        print_status "Creating Dokku app: $APP_NAME"
        dokku apps:create "$APP_NAME"
    else
        print_status "App $APP_NAME already exists"
    fi

    # Create PostgreSQL database if it doesn't exist
    if ! dokku postgres:exists "$DB_NAME"; then
        print_status "Creating PostgreSQL database: $DB_NAME"
        dokku postgres:create "$DB_NAME"
        dokku postgres:link "$DB_NAME" "$APP_NAME"
    else
        print_status "Database $DB_NAME already exists"
        # Ensure it's linked to the app
        dokku postgres:link "$DB_NAME" "$APP_NAME" || true
    fi

    # Set environment variables
    print_status "Setting environment variables..."
    dokku config:set "$APP_NAME" NODE_ENV=production
    dokku config:set "$APP_NAME" DB_TYPE=postgresql
    dokku config:set "$APP_NAME" PORT=5000

    # Generate JWT secret if not set
    if ! dokku config:get "$APP_NAME" JWT_SECRET > /dev/null 2>&1; then
        JWT_SECRET=$(openssl rand -base64 32)
        dokku config:set "$APP_NAME" JWT_SECRET="$JWT_SECRET"
        print_status "Generated JWT secret"
    fi

    # Set bcrypt rounds
    dokku config:set "$APP_NAME" BCRYPT_ROUNDS=12

    # Configure domains (optional)
    if [ -n "$DOMAIN" ]; then
        print_status "Setting domain: $DOMAIN"
        dokku domains:set "$APP_NAME" "$DOMAIN"
    fi

    # Configure SSL (optional)
    if [ "$SSL" = "true" ]; then
        print_status "Enabling SSL..."
        dokku letsencrypt:enable "$APP_NAME" || print_warning "SSL setup failed, continuing without SSL"
    fi

    print_status "Server setup complete!"
    exit 0
fi

# Client-side deployment
print_status "Preparing local deployment..."

# Check if we're in the correct directory
if [ ! -f "package.json" ] || [ ! -f "Procfile" ]; then
    print_error "This script must be run from the root of the ParkML project"
    exit 1
fi

# Check if git remote exists
if ! git remote get-url dokku > /dev/null 2>&1; then
    print_status "Adding Dokku remote..."
    git remote add dokku "$DOKKU_USER@$DOKKU_HOST:$APP_NAME"
else
    print_status "Dokku remote already exists"
fi

# Build and test locally first
print_status "Building application locally..."
npm run build || {
    print_error "Build failed! Please fix build errors before deploying."
    exit 1
}

print_status "Running type checks..."
npm run typecheck || {
    print_error "Type check failed! Please fix TypeScript errors before deploying."
    exit 1
}

# Check if Prisma is properly configured
print_status "Checking Prisma configuration..."
cd apps/backend
npm run db:generate || {
    print_warning "Prisma client generation failed, but continuing with deployment"
}
cd ../..

# Deploy to Dokku
print_status "Deploying to Dokku..."
git push dokku main || {
    print_error "Deployment failed!"
    exit 1
}

# Run database migrations with Prisma
print_status "Running Prisma database migrations..."
ssh "$DOKKU_USER@$DOKKU_HOST" "dokku run '$APP_NAME' npm run db:migrate:deploy" || {
    print_warning "Prisma migration failed"
}

# Generate Prisma client in production
print_status "Generating Prisma client..."
ssh "$DOKKU_USER@$DOKKU_HOST" "dokku run '$APP_NAME' npm run db:generate" || {
    print_warning "Prisma client generation failed"
}

# Check deployment status
print_status "Checking deployment status..."
ssh "$DOKKU_USER@$DOKKU_HOST" "dokku ps:report '$APP_NAME'"

print_status "✅ Deployment complete!"
print_status "Your application should be available at: http://$DOKKU_HOST"

# Show logs
print_status "Recent logs:"
ssh "$DOKKU_USER@$DOKKU_HOST" "dokku logs '$APP_NAME' --tail"
