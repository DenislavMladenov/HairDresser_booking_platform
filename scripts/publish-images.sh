#!/usr/bin/env bash
# Builds the API and web images and pushes them to the container registry.
#
# Every push produces two tags: an immutable one derived from the commit, and
# `latest`. The immutable tag is what makes a rollback possible, since `latest`
# moves and cannot be pointed back at a known-good build.
#
#   ./scripts/publish-images.sh              # tag from the current commit
#   ./scripts/publish-images.sh v1.0.0       # explicit version tag
#
# Log in first. For GitHub Container Registry, use a personal access token with
# the write:packages scope, never your account password:
#
#   echo "$GHCR_TOKEN" | docker login ghcr.io -u DenislavMladenov --password-stdin
set -euo pipefail

cd "$(cd "$(dirname "$0")/.." && pwd)"

REGISTRY="${IMAGE_REGISTRY:-ghcr.io/denislavmladenov}"
API_IMAGE="$REGISTRY/hairdresser-booking-api"
WEB_IMAGE="$REGISTRY/hairdresser-booking-web"

# An explicit argument wins; otherwise derive a tag from git so the image can
# always be traced back to the code that produced it.
if [ "$#" -ge 1 ]; then
  TAG="$1"
elif git rev-parse --git-dir > /dev/null 2>&1; then
  TAG="$(git rev-parse --short HEAD)"
  if [ -n "$(git status --porcelain)" ]; then
    echo "Warning: the working tree has uncommitted changes, so tag $TAG will not"
    echo "         match what is committed. Commit first for a traceable image."
    printf 'Continue anyway? [y/N] '
    read -r answer
    [ "$answer" = 'y' ] || [ "$answer" = 'Y' ] || exit 1
    TAG="$TAG-dirty"
  fi
else
  echo 'Not a git repository and no tag given; pass one explicitly.' >&2
  exit 1
fi

echo "Registry: $REGISTRY"
echo "Tag:      $TAG"
echo

# Refuse to push without credentials rather than failing halfway through.
registry_host="${REGISTRY%%/*}"
if ! grep -q "$registry_host" "${DOCKER_CONFIG:-$HOME/.docker}/config.json" 2>/dev/null; then
  echo "Not logged in to $registry_host. Run:" >&2
  echo "  echo \"\$GHCR_TOKEN\" | docker login $registry_host -u <username> --password-stdin" >&2
  exit 1
fi

echo '== building =='
IMAGE_TAG="$TAG" docker compose -f compose.yml -f compose.build.yml build

echo '== tagging latest =='
docker tag "$API_IMAGE:$TAG" "$API_IMAGE:latest"
docker tag "$WEB_IMAGE:$TAG" "$WEB_IMAGE:latest"

echo '== pushing =='
for reference in "$API_IMAGE:$TAG" "$API_IMAGE:latest" "$WEB_IMAGE:$TAG" "$WEB_IMAGE:latest"; do
  echo "  $reference"
  docker push -q "$reference"
done

echo
echo 'Pushed:'
docker images --format '  {{.Repository}}:{{.Tag}}  {{.Size}}' \
  | grep -E "hairdresser-booking-(api|web):($TAG|latest)" | sort -u

cat <<EOF

On the server, with IMAGE_TAG=$TAG in .env for a pinned deploy:

  docker login $registry_host
  docker compose pull
  docker compose up -d

Leaving IMAGE_TAG unset follows :latest instead.
EOF
