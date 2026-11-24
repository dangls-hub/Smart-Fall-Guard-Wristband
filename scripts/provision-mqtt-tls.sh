#!/usr/bin/env bash
set -euo pipefail
umask 077

if (( $# < 1 || $# > 2 )) || [[ ! $1 =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]]; then
    echo 'Usage: bash scripts/provision-mqtt-tls.sh DNS_NAME [IP_ADDRESS]' >&2
    exit 2
fi

san="DNS:$1"
if (( $# == 2 )); then
    if [[ ! $2 =~ ^[0-9A-Fa-f.:]+$ ]]; then
        echo 'IP_ADDRESS must be a literal IPv4 or IPv6 address.' >&2
        exit 2
    fi
    san+=",IP:$2"
fi

certs="$(cd -- "$(dirname -- "$0")/../certs" && pwd)"
output="$certs/local"
if [[ -n ${MQTT_TLS_DIR:-} ]]; then
    if [[ $MQTT_TLS_DIR != /* ]]; then
        echo 'Use an absolute path for MQTT_TLS_DIR.' >&2
        exit 2
    fi
    output="$MQTT_TLS_DIR"
fi
if [[ -e $output || -L $output ]]; then
    echo "Certificate directory already exists: $output" >&2
    exit 1
fi

stage="$(mktemp -d "${TMPDIR:-/tmp}/fallguard-tls.XXXXXX")"
trap 'rm -rf -- "$stage"' EXIT
if [[ $(stat -c '%a' -- "$stage") != 700 ]]; then
    echo 'Choose TMPDIR on a filesystem that supports private directories.' >&2
    exit 1
fi

openssl req -x509 -newkey rsa:3072 -nodes -sha256 -days 3650 \
    -subj '/CN=Fall-Guard MQTT CA' -keyout "$stage/ca.key" -out "$stage/ca.crt" \
    -addext 'basicConstraints=critical,CA:TRUE,pathlen:0' \
    -addext 'keyUsage=critical,keyCertSign,cRLSign'
openssl req -new -newkey rsa:2048 -nodes -sha256 \
    -subj '/CN=Fall-Guard MQTT Broker' -keyout "$stage/server.key" -out "$stage/server.csr"

cat > "$stage/server.ext" <<EOF
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=$san
EOF
openssl x509 -req -sha256 -days 365 -in "$stage/server.csr" \
    -CA "$stage/ca.crt" -CAkey "$stage/ca.key" -CAcreateserial \
    -extfile "$stage/server.ext" -out "$stage/server.crt"
openssl verify -purpose sslserver -verify_hostname "$1" -CAfile "$stage/ca.crt" "$stage/server.crt"
if (( $# == 2 )); then
    openssl verify -purpose sslserver -verify_ip "$2" -CAfile "$stage/ca.crt" "$stage/server.crt"
fi

# mkdir fails if another run already installed a certificate set.
mkdir -m 700 -- "$output"
if [[ $(stat -c '%a' -- "$output") != 700 ]]; then
    rmdir -- "$output"
    echo 'Certificate directory cannot enforce private-key permissions. Set MQTT_TLS_DIR to a location on a Linux filesystem.' >&2
    exit 1
fi
install -m 600 -- "$stage/ca.key" "$stage/server.key" "$output/"
install -m 644 -- "$stage/ca.crt" "$stage/server.crt" "$output/"
if [[ $(stat -c '%a' -- "$output/ca.key") != 600 || $(stat -c '%a' -- "$output/server.key") != 600 ]]; then
    rm -f -- "$output/ca.key" "$output/server.key" "$output/ca.crt" "$output/server.crt"
    rmdir -- "$output"
    echo 'Certificate directory cannot enforce private-key permissions.' >&2
    exit 1
fi
echo "MQTT certificates installed in $output. Use ca.crt as the client trust anchor."
