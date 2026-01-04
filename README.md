# Happy Server

Minimal backend for open-source end-to-end encrypted Claude Code clients.

## What is Happy?

Happy Server is the synchronization backbone for secure Claude Code clients. It enables multiple devices to share encrypted conversations while maintaining complete privacy - the server never sees your messages, only encrypted blobs it cannot read.

## Features

- 🔐 **Zero Knowledge** - The server stores encrypted data but has no ability to decrypt it
- 🎯 **Minimal Surface** - Only essential features for secure sync, nothing more  
- 🕵️ **Privacy First** - No analytics, no tracking, no data mining
- 📖 **Open Source** - Transparent implementation you can audit and self-host
- 🔑 **Cryptographic Auth** - No passwords stored, only public key signatures
- ⚡ **Real-time Sync** - WebSocket-based synchronization across all your devices
- 📱 **Multi-device** - Seamless session management across phones, tablets, and computers
- 🔔 **Push Notifications** - Notify when Claude Code finishes tasks or needs permissions (encrypted, we can't see the content)
- 🌐 **Distributed Ready** - Built to scale horizontally when needed

## How It Works

Your Claude Code clients generate encryption keys locally and use Happy Server as a secure relay. Messages are end-to-end encrypted before leaving your device. The server's job is simple: store encrypted blobs and sync them between your devices in real-time.

## Hosting

**You don't need to self-host!** Our free cloud Happy Server at `happy-api.slopus.com` is just as secure as running your own. Since all data is end-to-end encrypted before it reaches our servers, we literally cannot read your messages even if we wanted to. The encryption happens on your device, and only you have the keys.

That said, Happy Server is open source and self-hostable if you prefer running your own infrastructure. The security model is identical whether you use our servers or your own.

## Deploy to Hugging Face Spaces (Docker)

1. Create a new Space and choose **Docker** as the SDK.
2. Push this repository to the Space (or connect the Space to your Git repo).
3. In the Space settings, add **Secrets / Variables** (do not commit real credentials):
   - `DATABASE_URL`: use the value from `.env.mysql` (MySQL connection string)
   - `HANDY_MASTER_SECRET`: a strong random secret (required for auth/token encryption)
   - Optional: `BASE_PATH=/happy` (serve under a subpath like `/happy/*` instead of `/`)
   - Optional: `METRICS_ENABLED=false` (disable the extra metrics server)
   - Optional integrations: `GITHUB_*`, `ELEVENLABS_API_KEY`, `S3_*`
4. Ensure your MySQL instance is reachable from the public Internet (firewall / security group allows inbound from Hugging Face runners).

Notes:
- The Docker image defaults to `PORT=7860` (Hugging Face Spaces convention). Override `PORT` only if you know what you’re doing.
- If your MySQL requires TLS, add the relevant query params to `DATABASE_URL` (example: `?sslaccept=strict`).

## License

MIT - Use it, modify it, deploy it anywhere.
