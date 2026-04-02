# FortiGate Debug Command Generator

**Version:** 1.1.0 ([`VERSION`](VERSION))

A web-based tool for generating FortiGate firewall debug CLI commands based on troubleshooting scenarios. This application helps network engineers quickly generate the correct debug commands for various FortiGate troubleshooting topics.

## Features

- **Interactive Command Generation**: Select FortiOS version, troubleshooting topic, and parameters to generate CLI-aligned debug commands
- **FortiOS version selection**: Commands are tailored to the FortiOS release family you choose (e.g. 7.2.x, 7.4.x, 7.6.x)
- **Dark / light theme**: Toggle from the header (preference stored in the browser)
- **Multiple Troubleshooting Topics**:
  - Traffic / Policy / Session (Flow Debug)
  - IPsec VPN
  - SSL VPN
  - Routing and Connectivity (OSPF/BGP)
  - User Authentication / FSSO / SSO
  - High Availability (HA)
  - UTM (IPS, Application Control, Web Filter)
  - System / Performance

- **Flexible Input Parameters**:
  - Source IP address (optional)
  - Destination IP address (optional)
  - Protocol (ICMP/TCP/UDP - optional)
  - Destination port (optional)
  - Optional sniffer options: interface, verbosity, packet count

- **Smart Command Organization**:
  - Commands organized by section (Debug, Flow Trace, Sniffer, etc.)
  - Individual copy buttons for each section
  - Individual copy buttons for each sniffer command
  - Automatic comment removal (comments cause CLI errors)

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- For Docker deployment: Docker installed (Compose v2: `docker compose`, or legacy `docker-compose`)

### Installation Options

#### Option 1: Docker Deployment (Recommended for Production)

1. **Clone this repository:**
```bash
git clone https://github.com/kitkat0981/Fortigate_Troubleshooting_command_generator.git
cd Fortigate_Troubleshooting_command_generator
```

2. **Build the Docker image:**
```bash
docker build -t fortigate-debug-generator .
```

3. **Run the container:**
```bash
docker run -d -p 8080:80 --name fortigate-debug-generator --restart unless-stopped fortigate-debug-generator
```

4. **Access the application:**
   - Open your browser and navigate to `http://your-server-ip:8080`
   - Or if running locally: `http://localhost:8080`

**Using Docker Compose (Alternative):**
```bash
docker compose up -d
```
(If you use Compose V1: `docker-compose up -d`.)

#### Option 2: Local Development

1. Clone this repository:
```bash
git clone https://github.com/kitkat0981/Fortigate_Troubleshooting_command_generator.git
cd Fortigate_Troubleshooting_command_generator
```

2. Open `index.html` in your web browser:
   - Simply double-click the file, or
   - Use a local web server (recommended):
     ```bash
     # Python 3
     python3 -m http.server 8000
     
     # Python 2
     python -m SimpleHTTPServer 8000
     
     # Node.js (with http-server)
     npx http-server
     ```
   - Then navigate to `http://localhost:8000` in your browser

## Usage

1. **Fill in the form**:
   - Select FortiOS version (required)
   - Select troubleshooting topic (required)
   - Enter source/destination IP, protocol, and port as needed (optional)
   - Expand **Sniffer Packet Options** if you want custom sniffer interface, verbosity, or packet count

2. **Generate commands**:
   - Click **Generate Commands**
   - Output is grouped by section; each section has a **Copy Code** button

3. **Copy commands**:
   - Use **Copy Code** on a section to copy all commands in that block
   - For sniffer lines, each command has its own copy control
   - Comment lines are stripped so pasted commands run cleanly on the CLI

## File Structure

```
Fortigate_Troubleshooting_command_generator/
├── index.html              # Main HTML file
├── styles.css              # Styling
├── app.js                  # Main application logic
├── fortigate_debug_cheatsheet.txt  # Reference cheatsheet
├── Dockerfile              # Docker image configuration
├── docker-compose.yml      # Docker Compose configuration
├── nginx.conf              # Nginx web server configuration
├── .dockerignore           # Files to exclude from Docker build
├── .gitignore              # Git ignore rules
├── DEPLOYMENT.md           # Server deployment and Git sync workflow
├── VERSION                 # Current app release number (keep in sync with app.js)
├── LICENSE                 # Custom License (Non-Commercial)
└── README.md               # This file
```

Personal or server-specific helper scripts (for example a local `deploy.sh`) are intentionally **not** tracked in Git; add them only on your machine and keep them out of commits (see `.gitignore`).

## Docker Deployment Guide

For **cloning on a Linux server**, **updating from GitHub**, **cron-based refreshes**, and **update scripts**, use [DEPLOYMENT.md](DEPLOYMENT.md). The sections below are a quick reference for build, run, and health checks.

### Building the Docker Image

On your Docker host, run:

```bash
# Clone the repository (if not already done)
git clone https://github.com/kitkat0981/Fortigate_Troubleshooting_command_generator.git
cd Fortigate_Troubleshooting_command_generator

# Build the Docker image
docker build -t fortigate-debug-generator .
```

### Running the Container

**Basic run:**
```bash
docker run -d -p 8080:80 --name fortigate-debug-generator fortigate-debug-generator
```

**With auto-restart:**
```bash
docker run -d -p 8080:80 --name fortigate-debug-generator --restart unless-stopped fortigate-debug-generator
```

**Using Docker Compose:**
```bash
docker compose up -d
```

### Managing the Container

**View running containers:**
```bash
docker ps
```

**View logs:**
```bash
docker logs fortigate-debug-generator
```

**Stop the container:**
```bash
docker stop fortigate-debug-generator
```

**Start the container:**
```bash
docker start fortigate-debug-generator
```

**Remove the container:**
```bash
docker stop fortigate-debug-generator
docker rm fortigate-debug-generator
```

**Update after new commits:** pull the latest code, rebuild the image, and recreate the container. See the full sequence in [DEPLOYMENT.md](DEPLOYMENT.md).

### Port Configuration

By default, the container exposes port 80 internally and maps it to port 8080 on the host. To use a different port:

```bash
docker run -d -p 3000:80 --name fortigate-debug-generator fortigate-debug-generator
```

This would make the application available on port 3000 instead of 8080.

### Health Check

The container includes a health check endpoint at `/health`. You can verify the container is running:

```bash
curl http://localhost:8080/health
```

Or from outside the server:
```bash
curl http://your-server-ip:8080/health
```

## Security Notes

- **Runs in the browser**: Command generation is client-side; nothing is sent to a backend for the core tool
- **Local preferences only**: Theme choice is stored in `localStorage` in your browser
- **Hosted copy**: When you open the app from your own server or Docker image, serve it over HTTPS in production if the page is reachable from untrusted networks

## Troubleshooting

### Commands not working?
- Ensure you're copying commands without comment lines (handled automatically)
- Verify IP addresses are in correct format (4 octets)
- Check that ports are within valid range (22-65535)
- Pick the FortiOS version that matches your device so CLI syntax matches your release

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under a custom license. See [LICENSE](LICENSE) for details.

**Important**: This software may NOT be sold or used for commercial purposes without explicit written permission from the copyright holder. All rights reserved.

## Disclaimer

This tool is provided as-is for educational and troubleshooting purposes. Always test commands in a non-production environment first. The authors are not responsible for any issues arising from the use of generated commands.

## Acknowledgments

- Based on the FortiGate Debug Cheat Sheet (`fortigate_debug_cheatsheet.txt`)

