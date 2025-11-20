# Docker Server Deployment Guide

This guide explains how to sync your GitHub repository with your Docker server and keep it updated.

## Initial Setup (First Time)

### Step 1: Connect to Your Docker Server

```bash
ssh user@your-docker-server-ip
```

### Step 2: Install Git (if not already installed)

**On Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install git -y
```

**On CentOS/RHEL:**
```bash
sudo yum install git -y
```

**On Alpine Linux:**
```bash
apk add git
```

### Step 3: Clone the Repository

```bash
# Navigate to where you want to store the project
cd /opt  # or /home/youruser, or wherever you prefer

# Clone the repository
git clone https://github.com/kitkat0981/Fortigate_Troubleshooting_command_generator.git

# Navigate into the project directory
cd Fortigate_Troubleshooting_command_generator
```

### Step 4: Build and Run the Docker Container

```bash
# Build the Docker image
docker build -t fortigate-debug-generator .

# Run the container
docker run -d -p 8080:80 --name fortigate-debug-generator --restart unless-stopped fortigate-debug-generator
```

### Step 5: Verify It's Running

```bash
# Check container status
docker ps

# Check logs
docker logs fortigate-debug-generator

# Test the application
curl http://localhost:8080/health
```

## Updating the Application (Syncing with GitHub)

When you make changes to the code and push to GitHub, follow these steps on your Docker server:

### Method 1: Manual Update (Recommended)

```bash
# Navigate to the project directory
cd /opt/Fortigate_Troubleshooting_command_generator  # or wherever you cloned it

# Pull the latest changes from GitHub
git pull origin main

# Rebuild the Docker image
docker build -t fortigate-debug-generator .

# Stop the running container
docker stop fortigate-debug-generator

# Remove the old container
docker rm fortigate-debug-generator

# Start a new container with the updated image
docker run -d -p 8080:80 --name fortigate-debug-generator --restart unless-stopped fortigate-debug-generator
```

### Method 2: Using a Update Script

Create an update script for easier updates:

```bash
# Create the update script
cat > /opt/Fortigate_Troubleshooting_command_generator/update.sh << 'EOF'
#!/bin/bash
set -e

cd /opt/Fortigate_Troubleshooting_command_generator

echo "Pulling latest changes from GitHub..."
git pull origin main

echo "Building Docker image..."
docker build -t fortigate-debug-generator .

echo "Stopping old container..."
docker stop fortigate-debug-generator || true
docker rm fortigate-debug-generator || true

echo "Starting new container..."
docker run -d -p 8080:80 --name fortigate-debug-generator --restart unless-stopped fortigate-debug-generator

echo "Update complete!"
docker ps | grep fortigate-debug-generator
EOF

# Make it executable
chmod +x /opt/Fortigate_Troubleshooting_command_generator/update.sh
```

Then you can update with a single command:
```bash
/opt/Fortigate_Troubleshooting_command_generator/update.sh
```

### Method 3: Using Docker Compose (Alternative)

If you prefer using Docker Compose:

```bash
cd /opt/Fortigate_Troubleshooting_command_generator

# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

## Automated Updates with Cron (Optional)

To automatically check for updates and deploy them:

```bash
# Edit crontab
crontab -e

# Add this line to check for updates every day at 2 AM
0 2 * * * cd /opt/Fortigate_Troubleshooting_command_generator && git pull origin main && docker build -t fortigate-debug-generator . && docker stop fortigate-debug-generator && docker rm fortigate-debug-generator && docker run -d -p 8080:80 --name fortigate-debug-generator --restart unless-stopped fortigate-debug-generator >> /var/log/fortigate-update.log 2>&1
```

Or use the update script:
```bash
0 2 * * * /opt/Fortigate_Troubleshooting_command_generator/update.sh >> /var/log/fortigate-update.log 2>&1
```

## Quick Reference Commands

### Check Current Status
```bash
# Check if container is running
docker ps | grep fortigate-debug-generator

# View logs
docker logs fortigate-debug-generator

# View last 50 lines of logs
docker logs --tail 50 fortigate-debug-generator

# Follow logs in real-time
docker logs -f fortigate-debug-generator
```

### Stop/Start Container
```bash
# Stop
docker stop fortigate-debug-generator

# Start
docker start fortigate-debug-generator

# Restart
docker restart fortigate-debug-generator
```

### Check Git Status
```bash
cd /opt/Fortigate_Troubleshooting_command_generator
git status
git log --oneline -5  # See last 5 commits
```

### Force Pull (if you have local changes)
```bash
cd /opt/Fortigate_Troubleshooting_command_generator
git fetch origin
git reset --hard origin/main
```

## Troubleshooting

### Container won't start
```bash
# Check logs for errors
docker logs fortigate-debug-generator

# Check if port is already in use
sudo netstat -tulpn | grep 8080
# or
sudo ss -tulpn | grep 8080
```

### Git pull fails
```bash
# Check your connection
ping github.com

# Check git remote
git remote -v

# If you need to re-authenticate, you may need to set up SSH keys or use a personal access token
```

### Docker build fails
```bash
# Check Docker is running
sudo systemctl status docker

# Check disk space
df -h

# Clean up old images
docker system prune -a
```

## Security Notes

- The application runs on port 8080 by default. Consider using a reverse proxy (nginx, Traefik) for HTTPS
- Ensure your firewall allows access to port 8080 if accessing from outside
- Keep your Docker server updated with security patches
- Consider using SSH keys instead of passwords for server access

