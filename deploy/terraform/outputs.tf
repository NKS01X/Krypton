# ── Outputs ──────────────────────────────────────────────────────────────────

output "instance_public_ip" {
  description = "Public IP of the Krypton server"
  value       = oci_core_instance.krypton_vm.public_ip
}

output "instance_id" {
  description = "OCID of the compute instance"
  value       = oci_core_instance.krypton_vm.id
}

output "ssh_command" {
  description = "SSH into the server"
  value       = "ssh opc@${oci_core_instance.krypton_vm.public_ip}"
}

output "next_steps" {
  description = "What to do after terraform apply"
  value       = <<-EOT

    ╔══════════════════════════════════════════════════════════════╗
    ║                    🚀 NEXT STEPS                            ║
    ╠══════════════════════════════════════════════════════════════╣
    ║                                                              ║
    ║  1. Wait 2-3 min for cloud-init to finish                    ║
    ║                                                              ║
    ║  2. SSH into the server:                                     ║
    ║     ssh opc@${oci_core_instance.krypton_vm.public_ip}                                  ║
    ║                                                              ║
    ║  3. Clone your repo:                                         ║
    ║     git clone <your-repo> /opt/krypton/app                   ║
    ║                                                              ║
    ║  4. Setup .env:                                              ║
    ║     cd /opt/krypton/app                                      ║
    ║     cp deploy/.env.prod.example .env                         ║
    ║     nano .env  # fill in your secrets                        ║
    ║                                                              ║
    ║  5. Deploy:                                                  ║
    ║     /opt/krypton/deploy.sh                                   ║
    ║                                                              ║
    ║  6. Visit: https://${var.domain}               ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝

  EOT
}
