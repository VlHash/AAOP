# OpenFrp SSH setup

Create a TCP tunnel:

```text
Local IP:   127.0.0.1
Local port: 22
```

Actions secrets:

```text
OPENFRP_TOKEN
OPENFRP_TUNNEL_ID
```

Optional:

```text
SSH_PUBLIC_KEY
```

Enable `enable_ssh=true`, provide the node address and remote TCP port, then use
the SSH command printed in the job summary.

Finish with:

```bash
sudo finish-porting
```
