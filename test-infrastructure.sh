#!/bin/bash

# Test script for infrastructure endpoints

API="http://localhost:3007/v1"

echo "=== Running Infrastructure Migrations ==="
curl -X POST $API/system/migrations/run -H "Content-Type: application/json" | jq .

echo ""
echo "=== Checking Migration Status ==="
curl -s $API/system/migrations/status | jq .

echo ""
echo "=== Getting All Servers ==="
curl -s $API/infrastructure/servers | jq '.[] | {id, name, os, environment}'

echo ""
echo "=== Getting All Services ==="
curl -s $API/infrastructure/services | jq '.[] | {id, name, type, port, status}'

echo ""
echo "=== Getting All Devices ==="
curl -s $API/infrastructure/devices | jq '.[] | {id, name, type, os, owner}'

echo ""
echo "=== Getting Infrastructure Graph ==="
curl -s $API/infrastructure/graph | jq '{nodes: (.nodes | length), edges: (.edges | length)}'

echo ""
echo "=== Sample Graph Data ==="
curl -s $API/infrastructure/graph | jq '{
  servers: [.nodes[] | select(.entityType == "server") | {id, name}],
  services: [.nodes[] | select(.entityType == "service") | {id, name}],
  relationships_count: (.edges | length)
}'
