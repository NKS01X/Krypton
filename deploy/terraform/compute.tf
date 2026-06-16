# ── Find latest Oracle Linux 9 ARM image ─────────────────────────────────────

data "oci_core_images" "oracle_linux_arm" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Oracle Linux"
  operating_system_version = "9"
  shape                    = var.instance_shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"

  filter {
    name   = "display_name"
    values = ["^Oracle-Linux-9\\.\\d+-aarch64-\\d{4}\\.\\d{2}\\.\\d{2}-\\d+$"]
    regex  = true
  }
}

# ── ARM A1 Flex Instance ─────────────────────────────────────────────────────

resource "oci_core_instance" "krypton_vm" {
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  compartment_id      = var.compartment_ocid
  display_name        = "krypton-server"
  shape               = var.instance_shape

  shape_config {
    ocpus         = var.instance_ocpus
    memory_in_gbs = var.instance_memory_gb
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.krypton_public_subnet.id
    assign_public_ip = true
    display_name     = "krypton-vnic"
    hostname_label   = "krypton"
  }

  source_details {
    source_type             = "image"
    source_id               = data.oci_core_images.oracle_linux_arm.images[0].id
    boot_volume_size_in_gbs = var.boot_volume_gb
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data           = base64encode(templatefile("${path.module}/cloud-init.yaml", {
      domain        = var.domain
      duckdns_token = var.duckdns_token
    }))
  }

  # Prevent accidental destruction
  lifecycle {
    prevent_destroy = false
  }
}
