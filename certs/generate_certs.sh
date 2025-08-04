#!/bin/bash

# Generate self-signed certificates for gRPC TLS
# This script creates a CA and server certificates for local development

set -e

CERT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$CERT_DIR"

echo "Generating certificates in $CERT_DIR"

# Generate CA private key
openssl genrsa -out ca-key.pem 4096

# Generate CA certificate
openssl req -new -x509 -key ca-key.pem -sha256 -subj "/C=US/ST=CA/O=Demo/CN=Demo CA" -days 3650 -out ca-cert.pem

# Generate server private key
openssl genrsa -out server-key.pem 4096

# Generate server certificate signing request
openssl req -subj "/C=US/ST=CA/O=Demo/CN=localhost" -sha256 -new -key server-key.pem -out server.csr

# Generate server certificate signed by CA
cat > server-extensions.conf << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = server
DNS.3 = grpc-server
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

openssl x509 -req -in server.csr -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial -out server-cert.pem -days 365 -sha256 -extfile server-extensions.conf

# Generate client private key
openssl genrsa -out client-key.pem 4096

# Generate client certificate signing request
openssl req -subj "/C=US/ST=CA/O=Demo/CN=client" -sha256 -new -key client-key.pem -out client.csr

# Generate client certificate signed by CA
openssl x509 -req -in client.csr -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial -out client-cert.pem -days 365 -sha256

# Clean up CSR files
rm server.csr client.csr server-extensions.conf

echo "Certificates generated successfully:"
echo "  CA Certificate: ca-cert.pem"
echo "  Server Certificate: server-cert.pem"
echo "  Server Private Key: server-key.pem"
echo "  Client Certificate: client-cert.pem"
echo "  Client Private Key: client-key.pem"

# Set appropriate permissions
chmod 600 *.pem
chmod +x generate_certs.sh

echo "Certificate permissions set to 600"