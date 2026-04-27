# Savidhi GKE manifests

Apply order (greenfield cluster):

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
