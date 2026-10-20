#!/bin/sh
# Points the Google Fonts hosts at loopback for the rest of a CI job, so a
# build that still fetched a font from them fails (#83 test 11). Linux CI
# runners only: it appends to /etc/hosts with sudo and checks with getent.
set -eu

hosts="fonts.googleapis.com fonts.gstatic.com"
printf '127.0.0.1 %s\n::1 %s\n' "$hosts" "$hosts" | sudo tee -a /etc/hosts >/dev/null

for host in $hosts; do
  addresses=$(getent ahosts "$host" | awk '{ print $1 }' | sort -u | tr '\n' ' ')
  for address in $addresses; do
    if [ "$address" != "127.0.0.1" ] && [ "$address" != "::1" ]; then
      echo "block-google-fonts: $host still resolves to $address" >&2
      exit 1
    fi
  done
  echo "block-google-fonts: $host resolves to ${addresses:-nothing}"
done
