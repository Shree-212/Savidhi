# Savidhi GKE manifests

## Prerequisites — run before any gcloud / kubectl command

```bash
# The default gcloud login on this machine is cdgcphub@gmail.com (wrong account).
# Always switch to the operator account first.
gcloud config set account admin@savidhi.com
gcloud container clusters get-credentials savidhi-gke \
  --region=asia-south1 --project=savidhi-prod
```

## Apply migrations

```bash
# Start Cloud SQL Auth Proxy in the background:
cloud-sql-proxy savidhi-prod:asia-south1:savidhi-pg --port=5433 \
  --impersonate-service-account=admin@savidhi.com

# Apply a migration (adjust filename as needed):
psql "host=127.0.0.1 port=5433 dbname=savidhi user=savidhi_user" \
  -f apps/savidhi_backend/migrations/010_extend_events_may2026.sql
```

## Apply order (greenfield cluster)

```bash
kubectl apply -f 00-namespace.yaml
# ESO must be installed at cluster scope first — see 01-secret-store.yaml header.
kubectl apply -f 01-secret-store.yaml
kubectl apply -f 02-configmap.yaml
kubectl apply -f 10-deployments.yaml
kubectl apply -f 20-ingress.yaml
kubectl apply -f 30-cronjob-appointment-autocomplete.yaml
```

Image bumps: edit `:v1` → `:v2` in `10-deployments.yaml` and (if the booking-service was rebuilt) in `30-cronjob-appointment-autocomplete.yaml`, then re-apply.

Health check: `curl https://api.savidhi.in/health` after Ingress provisions (5–15 min for managed cert).
