# Upload and run

1. Extract this ZIP at the root of `VlHash/AAOP`.
2. Run:

```bash
bash scripts/install-overlay.sh
git status --short
git diff --check
git add -A
git commit -m "ci: migrate AAOP controller to Embstar M31 ath79"
git push
```

3. Open GitHub Actions → **Embstar M31 ath79 port lab** → **Run workflow**.

Recommended first run:

```text
openwrt_ref                  v25.12.5
prepare_toolchain_before_ssh true
enable_ssh                   false
build_after_ssh              true
full_image_after_target      true
save_heavy_build_state       false
```

Artifacts:

- `m31-port-state-*`: logs, evidence, DTB and exported tested patch.
- `m31-firmware-*`: initramfs/sysupgrade outputs when the build succeeds.

Do not persistently flash the first sysupgrade output. Validate with initramfs
RAM/TFTP boot first.
