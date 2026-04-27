#!/usr/bin/env bash
# Idempotent bootstrap for the Savidhi GCP production environment.
# Re-running each block is safe — every command checks for prior state or uses --quiet.
#
# Pre-reqs (run once on the operator's laptop):
#   gcloud auth login
#   gcloud auth application-default login
#
# Usage:
#   PROJECT_ID=savidhi-prod REGION=asia-south1 bash apps/savidhi_backend/scripts/gcp-bootstrap.sh
#
# Or step through individual sections by sourcing this file and calling fns.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-savidhi-prod}"
REGION="${REGION:-asia-south1}"
BILLING_ACCOUNT="${BILLING_ACCOUNT:-}"   # 0123AB-456789-AB12CD — set before running for fresh project
DB_USER="${DB_USER:-savidhi_user}"

log()  { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*" >&2; }
exists_project()      { gcloud projects describe   "$PROJECT_ID"     >/dev/null 2>&1; }
exists_secret()       { gcloud secrets describe    "$1" --project="$PROJECT_ID" >/dev/null 2>&1; }
exists_address()      { gcloud compute addresses describe "$1" --global --project="$PROJECT_ID" >/dev/null 2>&1; }
exists_sql_instance() { gcloud sql instances describe "$1" --project="$PROJECT_ID" >/dev/null 2>&1; }
exists_redis()        { gcloud redis instances describe "$1" --region="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; }
exists_bucket()       { gcloud storage buckets describe "gs://$1" --project="$PROJECT_ID" >/dev/null 2>&1; }
exists_cluster()      { gcloud container clusters describe "$1" --region="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; }
exists_repo()         { gcloud artifacts repositories describe "$1" --location="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; }

# ─── A. Project + APIs ────────────────────────────────────────────────────────
bootstrap_project() {
  log "A. Project: $PROJECT_ID in $REGION"
  if ! exists_project; then
    gcloud projects create "$PROJECT_ID" --name="Savidhi Production"
    if [ -n "$BILLING_ACCOUNT" ]; then
      gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT"
    else
      warn "BILLING_ACCOUNT not set — link billing manually before continuing."
    fi
  fi
  gcloud config set project "$PROJECT_ID"
  gcloud services enable \
    container.googleapis.com run.googleapis.com sqladmin.googleapis.com \
    servicenetworking.googleapis.com cloudbuild.googleapis.com \
    artifactregistry.googleapis.com redis.googleapis.com dns.googleapis.com \
    certificatemanager.googleapis.com compute.googleapis.com \
    secretmanager.googleapis.com iamcredentials.googleapis.com
}

# ─── B. Networking (VPC, subnet, NAT) ────────────────────────────────────────
bootstrap_network() {
  log "B. VPC + subnet + Cloud NAT"
  gcloud compute networks describe savidhi-vpc --project="$PROJECT_ID" >/dev/null 2>&1 \
    || gcloud compute networks create savidhi-vpc --subnet-mode=custom --project="$PROJECT_ID"

  gcloud compute networks subnets describe savidhi-gke-subnet --region="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1 \
    || gcloud compute networks subnets create savidhi-gke-subnet \
         --network=savidhi-vpc --region="$REGION" --range=10.10.0.0/20 \
         --secondary-range=pods=10.20.0.0/14,services=10.30.0.0/20 \
         --enable-private-ip-google-access --project="$PROJECT_ID"

  gcloud compute routers describe savidhi-router --region="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1 \
    || gcloud compute routers create savidhi-router --network=savidhi-vpc --region="$REGION" --project="$PROJECT_ID"

  gcloud compute routers nats describe savidhi-nat --router=savidhi-router --region="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1 \
    || gcloud compute routers nats create savidhi-nat --router=savidhi-router --region="$REGION" \
         --nat-all-subnet-ip-ranges --auto-allocate-nat-external-ips --project="$PROJECT_ID"
}

# ─── C. Cloud SQL Postgres 15 (private IP) ───────────────────────────────────
bootstrap_sql() {
  log "C. Cloud SQL Postgres + private services access"
  gcloud compute addresses describe google-managed-services-savidhi-vpc --global --project="$PROJECT_ID" >/dev/null 2>&1 \
    || gcloud compute addresses create google-managed-services-savidhi-vpc \
         --global --purpose=VPC_PEERING --prefix-length=16 --network=savidhi-vpc --project="$PROJECT_ID"

  gcloud services vpc-peerings connect --service=servicenetworking.googleapis.com \
    --ranges=google-managed-services-savidhi-vpc --network=savidhi-vpc --project="$PROJECT_ID" || true

  if ! exists_sql_instance savidhi-pg; then
    : "${DB_PASSWORD:?DB_PASSWORD must be set in the env before bootstrap_sql}"
    gcloud sql instances create savidhi-pg \
      --database-version=POSTGRES_15 --region="$REGION" \
      --tier=db-custom-2-7680 --storage-size=20GB --storage-auto-increase \
      --network=savidhi-vpc --no-assign-ip \
      --backup --backup-start-time=18:00 \
      --enable-point-in-time-recovery --project="$PROJECT_ID"
    gcloud sql databases create savidhi --instance=savidhi-pg --project="$PROJECT_ID"
    gcloud sql users create "$DB_USER" --instance=savidhi-pg --password="$DB_PASSWORD" --project="$PROJECT_ID"
  fi
}

# ─── D. Memorystore Redis ────────────────────────────────────────────────────
bootstrap_redis() {
  log "D. Memorystore Redis"
  exists_redis savidhi-redis || gcloud redis instances create savidhi-redis \
    --size=1 --region="$REGION" --redis-version=redis_7_0 \
    --network=savidhi-vpc --connect-mode=PRIVATE_SERVICE_ACCESS --project="$PROJECT_ID"
}

# ─── E. GCS buckets ──────────────────────────────────────────────────────────
bootstrap_gcs() {
  log "E. GCS buckets (media public-read, uploads private)"
  exists_bucket savidhi-media-prod || gcloud storage buckets create gs://savidhi-media-prod \
    --location="$REGION" --uniform-bucket-level-access --project="$PROJECT_ID"
  gcloud storage buckets add-iam-policy-binding gs://savidhi-media-prod \
    --member=allUsers --role=roles/storage.objectViewer --project="$PROJECT_ID" || true

  exists_bucket savidhi-uploads-prod || gcloud storage buckets create gs://savidhi-uploads-prod \
    --location="$REGION" --uniform-bucket-level-access --project="$PROJECT_ID"
}

# ─── F. GKE Autopilot ────────────────────────────────────────────────────────
bootstrap_gke() {
  log "F. GKE Autopilot private cluster"
  exists_cluster savidhi-gke || gcloud container clusters create-auto savidhi-gke \
    --region="$REGION" \
    --network=savidhi-vpc --subnetwork=savidhi-gke-subnet \
    --cluster-secondary-range-name=pods --services-secondary-range-name=services \
    --enable-private-nodes --enable-private-endpoint=false \
    --master-ipv4-cidr=172.16.0.0/28 --release-channel=regular --project="$PROJECT_ID"
  gcloud container clusters get-credentials savidhi-gke --region="$REGION" --project="$PROJECT_ID"
}

# ─── G. Artifact Registry ────────────────────────────────────────────────────
bootstrap_artifacts() {
  log "G. Artifact Registry"
  exists_repo savidhi || gcloud artifacts repositories create savidhi \
    --location="$REGION" --repository-format=docker --project="$PROJECT_ID"
  gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet
}

# ─── H. Secret Manager (placeholders — fill in real values) ──────────────────
bootstrap_secrets() {
  log "H. Secret Manager — creating placeholders if missing"
  for key in db-url redis-url jwt-access-secret jwt-refresh-secret \
             razorpay-key-id razorpay-key-secret razorpay-webhook-secret \
             twilio-account-sid twilio-auth-token twilio-verify-service-sid \
             prokerala-client-id prokerala-client-secret; do
    exists_secret "$key" || gcloud secrets create "$key" --replication-policy=automatic --project="$PROJECT_ID"
  done
  warn "Populate each secret manually: gcloud secrets versions add <key> --data-file=-"
}

# ─── I. Reserve global IP for ingress ────────────────────────────────────────
bootstrap_ingress_ip() {
  log "I. Reserve global IP for api.savidhi.in"
  exists_address savidhi-api-ip || gcloud compute addresses create savidhi-api-ip --global --project="$PROJECT_ID"
  gcloud compute addresses describe savidhi-api-ip --global --project="$PROJECT_ID" --format='value(address)'
}

# ─── J. Cloud DNS managed zone ───────────────────────────────────────────────
bootstrap_dns() {
  log "J. Cloud DNS managed zone for savidhi.in"
  gcloud dns managed-zones describe savidhi-zone --project="$PROJECT_ID" >/dev/null 2>&1 \
    || gcloud dns managed-zones create savidhi-zone --dns-name=savidhi.in. \
         --description="Savidhi" --project="$PROJECT_ID"
  gcloud dns managed-zones describe savidhi-zone --project="$PROJECT_ID" --format='value(nameServers)'
  warn "Update savidhi.in nameservers at the registrar to the 4 above."
}

# ─── Build + push all 7 service images ──────────────────────────────────────
build_and_push() {
  local tag="${1:-v1}"
  log "Build + push all 7 services as :$tag"
  cd "$(dirname "$0")/.."
  for svc in gateway auth user catalog booking media notification; do
    docker buildx build --platform=linux/amd64 \
      -t "$REGION-docker.pkg.dev/$PROJECT_ID/savidhi/${svc}-service:$tag" \
      -f "services/${svc}-service/Dockerfile" --target=runner --push .
  done
}

main() {
  bootstrap_project
  bootstrap_network
  bootstrap_sql
  bootstrap_redis
  bootstrap_gcs
  bootstrap_gke
  bootstrap_artifacts
  bootstrap_secrets
  bootstrap_ingress_ip
  bootstrap_dns
  log "Bootstrap complete. Next steps:"
  cat <<EOF
  1. Populate Secret Manager values (see bootstrap_secrets warning).
  2. Run migrations 001 → 009 against Cloud SQL via cloud-sql-proxy:
       cloud-sql-proxy --private-ip "$PROJECT_ID:$REGION:savidhi-pg" &
       psql "host=127.0.0.1 user=$DB_USER dbname=savidhi" -f migrations/001_init.sql
       # ... 002 → 009
  3. Build + push images:
       PROJECT_ID=$PROJECT_ID REGION=$REGION bash $(basename "$0") build_and_push v1
  4. Apply k8s manifests:
       kubectl apply -f apps/savidhi_backend/k8s/
  5. Deploy frontends to Cloud Run from apps/savidhi_web and apps/savidhi_admin.
  6. Wire DNS A-records to the global IP and Cloud Run domain mappings.
EOF
}

# Allow `bash gcp-bootstrap.sh build_and_push v2` style sub-invocations.
if [ "$#" -gt 0 ]; then
  fn="$1"; shift
  "$fn" "$@"
else
  main
fi
