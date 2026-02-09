// Jest global setup for testcontainers Docker socket configuration
// On macOS, testcontainers needs the Docker socket path explicitly set
import { platform, homedir } from 'os';
import { existsSync } from 'fs';

export default async function globalSetup() {
  // Only set DOCKER_HOST if not already set and on macOS
  if (!process.env.DOCKER_HOST && platform() === 'darwin') {
    const dockerSocketPath = `${homedir()}/.docker/run/docker.sock`;
    if (existsSync(dockerSocketPath)) {
      process.env.DOCKER_HOST = `unix://${dockerSocketPath}`;
    }
  }
}
