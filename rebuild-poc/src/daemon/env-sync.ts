import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export type PackageManager = 'bun' | 'pnpm' | 'yarn' | 'npm' | 'cargo' | 'go' | 'pip' | 'poetry' | 'gradle' | 'mvn' | 'bundle' | 'unknown';

export interface SyncResult {
  success: boolean;
  logs: string[];
  error?: string;
}

export class EnvSync {
  private cwd: string;
  private logs: string[] = [];

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  private log(msg: string) {
    const lines = msg.split('\n').filter(l => l.trim() !== '');
    this.logs.push(...lines);
    lines.forEach(l => console.log(l));
  }

  private runCommand(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    this.log(`> ${command}`);
    return new Promise((resolve) => {
      const child = spawn(command, { cwd: this.cwd, shell: true });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        this.log(text);
      });

      child.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        this.log(text);
      });

      child.on('close', (code) => {
        resolve({ stdout, stderr, exitCode: code ?? 1 });
      });
      
      child.on('error', (err) => {
        this.log(`Command failed to start: ${err.message}`);
        resolve({ stdout, stderr, exitCode: 1 });
      });
    });
  }

  public detectPackageManager(): PackageManager {
    if (fs.existsSync(path.join(this.cwd, 'bun.lockb'))) return 'bun';
    
    const pkgJsonPath = path.join(this.cwd, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        if (pkg.packageManager?.includes('bun')) return 'bun';
      } catch (e) {
        // ignore parsing errors
      }
    }
    
    if (fs.existsSync(path.join(this.cwd, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fs.existsSync(path.join(this.cwd, 'yarn.lock'))) return 'yarn';
    if (fs.existsSync(path.join(this.cwd, 'package-lock.json'))) return 'npm';
    if (fs.existsSync(path.join(this.cwd, 'Cargo.toml'))) return 'cargo';
    if (fs.existsSync(path.join(this.cwd, 'go.mod'))) return 'go';
    if (fs.existsSync(path.join(this.cwd, 'requirements.txt'))) return 'pip';
    if (fs.existsSync(path.join(this.cwd, 'poetry.lock'))) return 'poetry';
    if (fs.existsSync(path.join(this.cwd, 'build.gradle'))) return 'gradle';
    if (fs.existsSync(path.join(this.cwd, 'pom.xml'))) return 'mvn';
    if (fs.existsSync(path.join(this.cwd, 'Gemfile.lock'))) return 'bundle';

    return 'unknown';
  }

  public async syncGit(): Promise<boolean> {
    const commands = [
      'git status',
      'git rev-parse --abbrev-ref HEAD',
      'git fetch --all --prune',
      'git pull --ff-only'
    ];

    for (const cmd of commands) {
      const { exitCode } = await this.runCommand(cmd);
      if (exitCode !== 0) {
        this.log(`Git sync failed at command: ${cmd}`);
        return false;
      }
    }
    return true;
  }

  public async installDependencies(pm: PackageManager): Promise<boolean> {
    let cmd = '';
    switch (pm) {
      case 'bun': cmd = 'bun install'; break;
      case 'pnpm': cmd = 'pnpm install --frozen-lockfile'; break;
      case 'yarn': cmd = 'yarn install --frozen-lockfile'; break;
      case 'npm': cmd = 'npm ci'; break;
      case 'cargo': cmd = 'cargo fetch'; break;
      case 'go': cmd = 'go mod download'; break;
      case 'pip': cmd = 'pip install -r requirements.txt'; break;
      case 'poetry': cmd = 'poetry install'; break;
      case 'gradle': cmd = './gradlew dependencies'; break;
      case 'mvn': cmd = 'mvn dependency:resolve'; break;
      case 'bundle': cmd = 'bundle install'; break;
      default:
        this.log(`Unknown package manager: ${pm}. Cannot run frozen installation.`);
        return false;
    }

    if (cmd) {
      const { exitCode } = await this.runCommand(cmd);
      if (exitCode !== 0) {
        this.log(`Dependency installation failed: ${cmd}`);
        return false;
      }
    }
    
    // Also check for pre-commit hooks
    if (fs.existsSync(path.join(this.cwd, '.pre-commit-config.yaml'))) {
      const { exitCode } = await this.runCommand('pre-commit install');
      if (exitCode !== 0) {
        this.log('Failed to install pre-commit hooks.');
        return false;
      }
    }

    return true;
  }

  public async validateDependencies(pm: PackageManager): Promise<boolean> {
    const validations: Record<string, string[]> = {
      bun: ['bun -v'],
      pnpm: ['pnpm -v'],
      yarn: ['yarn -v'],
      npm: ['node -v', 'npm -v'],
      cargo: ['cargo --version'],
      go: ['go version'],
      pip: ['python --version', 'pip --version'],
      poetry: ['poetry --version']
    };

    const cmds = validations[pm] || [];
    for (const cmd of cmds) {
      const { exitCode } = await this.runCommand(cmd);
      if (exitCode !== 0) {
        this.log(`Validation failed: ${cmd}`);
        return false;
      }
    }
    return true;
  }

  public async runPhase1(): Promise<SyncResult> {
    this.log('Starting Phase 1: Environment Sync and Bootstrap');
    
    this.log('1. Detecting Package Manager');
    const pm = this.detectPackageManager();
    if (pm === 'unknown') {
      return { success: false, logs: this.logs, error: 'Could not detect package manager from repository files.' };
    }
    this.log(`Detected Package Manager: ${pm}`);

    this.log('2. Git Synchronization');
    if (!(await this.syncGit())) {
      return { success: false, logs: this.logs, error: 'Git synchronization failed. Please resolve manually or guide the agent.' };
    }

    this.log('3. Frozen/Locked Dependency Installation');
    if (!(await this.installDependencies(pm))) {
      return { success: false, logs: this.logs, error: 'Dependency installation failed.' };
    }

    this.log('4. Dependency Validation');
    if (!(await this.validateDependencies(pm))) {
      return { success: false, logs: this.logs, error: 'Dependency validation failed. Check your toolchain installations.' };
    }

    this.log('Phase 1 Bootstrap Completed Successfully.');
    return { success: true, logs: this.logs };
  }
}
