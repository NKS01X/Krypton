# ── Data Sources ─────────────────────────────────────────────────────────────

# Get list of availability domains
data "oci_identity_availability_domains" "ads" {
  compartment_id = var.tenancy_ocid
}

# ── VCN ──────────────────────────────────────────────────────────────────────

resource "oci_core_vcn" "krypton_vcn" {
  compartment_id = var.compartment_ocid
  cidr_blocks    = [var.vcn_cidr]
  display_name   = "krypton-vcn"
  dns_label      = "kryptonvcn"
}

# ── Internet Gateway ────────────────────────────────────────────────────────

resource "oci_core_internet_gateway" "krypton_igw" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.krypton_vcn.id
  display_name   = "krypton-igw"
  enabled        = true
}

# ── Route Table ──────────────────────────────────────────────────────────────

resource "oci_core_default_route_table" "default_rt" {
  manage_default_resource_id = oci_core_vcn.krypton_vcn.default_route_table_id
  display_name               = "krypton-default-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.krypton_igw.id
  }
}

# ── Security List ────────────────────────────────────────────────────────────

resource "oci_core_security_list" "krypton_sl" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.krypton_vcn.id
  display_name   = "krypton-security-list"

  # ── Egress: allow all outbound ──
  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
    stateless   = false
  }

  # ── Ingress: SSH ──
  ingress_security_rules {
    protocol    = "6" # TCP
    source      = var.ssh_allowed_cidr
    stateless   = false
    description = "SSH access"

    tcp_options {
      min = 22
      max = 22
    }
  }



  # ── Ingress: ICMP (ping — useful for debugging) ──
  ingress_security_rules {
    protocol    = "1" # ICMP
    source      = "0.0.0.0/0"
    stateless   = false
    description = "ICMP ping"
  }
}

# ── Public Subnet ────────────────────────────────────────────────────────────

resource "oci_core_subnet" "krypton_public_subnet" {
  compartment_id    = var.compartment_ocid
  vcn_id            = oci_core_vcn.krypton_vcn.id
  cidr_block        = var.subnet_cidr
  display_name      = "krypton-public-subnet"
  dns_label         = "kryptonpub"
  security_list_ids = [oci_core_security_list.krypton_sl.id]
  route_table_id    = oci_core_vcn.krypton_vcn.default_route_table_id

  # Public subnet — instances get public IPs
  prohibit_public_ip_on_vnic = false
}
