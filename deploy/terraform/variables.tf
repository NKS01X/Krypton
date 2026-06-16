# ── OCI Authentication ────────────────────────────────────────────────────────
variable "tenancy_ocid" {
  description = "OCID of your OCI tenancy"
  type        = string
}

variable "user_ocid" {
  description = "OCID of the OCI user"
  type        = string
}

variable "fingerprint" {
  description = "Fingerprint of the API signing key"
  type        = string
}

variable "private_key_path" {
  description = "Path to the OCI API private key PEM file"
  type        = string
}

variable "compartment_ocid" {
  description = "OCID of the compartment (use tenancy OCID for root compartment)"
  type        = string
}

# ── Region & Networking ──────────────────────────────────────────────────────
variable "region" {
  description = "OCI region to deploy in"
  type        = string
  default     = "ap-mumbai-1"
}

variable "vcn_cidr" {
  description = "CIDR block for the VCN"
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnet_cidr" {
  description = "CIDR block for the public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

# ── Compute ──────────────────────────────────────────────────────────────────
variable "instance_shape" {
  description = "Compute shape (Always Free ARM = VM.Standard.A1.Flex)"
  type        = string
  default     = "VM.Standard.A1.Flex"
}

variable "instance_ocpus" {
  description = "Number of OCPUs (Always Free limit: 2)"
  type        = number
  default     = 2
}

variable "instance_memory_gb" {
  description = "Memory in GB (Always Free limit: 12)"
  type        = number
  default     = 12
}

variable "boot_volume_gb" {
  description = "Boot volume size in GB (Always Free: 200 GB total)"
  type        = number
  default     = 100
}

variable "ssh_public_key" {
  description = "SSH public key for instance access"
  type        = string
}

variable "ssh_allowed_cidr" {
  description = "CIDR to allow SSH from (use your IP/32 for security, 0.0.0.0/0 for any)"
  type        = string
  default     = "0.0.0.0/0"
}

# ── App Config ───────────────────────────────────────────────────────────────
variable "domain" {
  description = "Domain name for the app"
  type        = string
  default     = "nikhil-krypton.duckdns.org"
}

variable "duckdns_token" {
  description = "DuckDNS API token for automatic DNS updates"
  type        = string
  default     = ""
  sensitive   = true
}
