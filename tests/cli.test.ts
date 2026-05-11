import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

type CliResult = {
  code: number;
  stdout: string;
  stderr: string;
};

type MobyRunManifestSidecar = {
  schemaVersion: string;
  runId: string;
  runType: string;
  generatedBy: string;
  generatedAt: string;
  status: string;
  sources: Array<{
    system: string;
    name?: string;
    fileName?: string;
    filePath?: string;
    receivedAt?: string;
    metadata?: Record<string, unknown>;
  }>;
  artifacts: Array<{
    id: string;
    role: string;
    path: string;
    format: string;
    mediaType?: string;
  }>;
  warnings: Array<{
    code: string;
    severity: string;
    message: string;
    artifactId?: string;
    field?: string;
    metadata?: Record<string, unknown>;
  }>;
  summary: {
    processedCount: number;
    successCount: number;
    warningCount: number;
    errorCount: number;
    artifactCount: number;
    metadata?: Record<string, unknown>;
  };
};

const projectRoot = process.cwd();
const cliPath = path.join(projectRoot, "src", "cli.ts");
const tsxCliPath = path.join(projectRoot, "node_modules", "tsx", "dist", "cli.mjs");
const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) =>
      rm(dir, {
        force: true,
        recursive: true,
      }),
    ),
  );
});

describe("Invoice Cost Spreader CLI", () => {
  it("keeps stdout-only JSON behavior without creating files", async () => {
    const tempDir = await makeTempDir();
    const runDir = path.join(tempDir, "runs");
    const sourceFile = path.join(projectRoot, "examples", "invoice-input.json");
    const result = await runCli([sourceFile, "--json"]);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");

    const stdoutJson = JSON.parse(result.stdout) as {
      allocationMethod: string;
      lines: unknown[];
      warnings: string[];
    };

    expect(stdoutJson.allocationMethod).toBe("unit");
    expect(stdoutJson.lines).toHaveLength(3);
    expect(stdoutJson.warnings).toEqual([]);
    await expectMissing(runDir);
  });

  it("writes spread result and MOBY run manifest in run-dir mode", async () => {
    const tempDir = await makeTempDir();
    const runDir = path.join(tempDir, "runs");
    const runId = "spread-run-001";
    const runPath = path.join(runDir, runId);
    const sourceFile = path.join(projectRoot, "examples", "invoice-input.json");
    const spreadResultPath = path.join(runPath, "spread-result.json");
    const manifestPath = path.join(runPath, "moby-run-manifest.json");
    const result = await runCli([
      sourceFile,
      "--json",
      "--run-dir",
      runDir,
      "--run-id",
      runId,
    ]);

    expect(result.code).toBe(0);
    await expectFile(spreadResultPath);
    await expectFile(manifestPath);

    const stdoutJson = JSON.parse(result.stdout) as Record<string, unknown>;
    const spreadResult = JSON.parse(
      await readFile(spreadResultPath, "utf8"),
    ) as Record<string, unknown>;
    const manifest = JSON.parse(
      await readFile(manifestPath, "utf8"),
    ) as MobyRunManifestSidecar;

    expect(spreadResult).toEqual(stdoutJson);
    expect(manifest).toMatchObject({
      schemaVersion: "1.0",
      runId,
      runType: "invoice_cost_spread",
      generatedBy: "invoice-cost-spreader",
      status: "completed",
      sources: [
        {
          system: "manual",
          name: "Invoice cost input",
          fileName: "invoice-input.json",
          filePath: sourceFile,
          metadata: {
            allocationMethod: "unit",
            lineCount: 3,
            additionalCosts: 180,
            discounts: 75,
          },
        },
      ],
      warnings: [],
      summary: {
        processedCount: 3,
        successCount: 3,
        warningCount: 0,
        errorCount: 0,
        metadata: {
          allocationMethod: "unit",
          totalBaseCost: 1832,
          totalQuantity: 277,
          additionalCosts: 180,
          discounts: 75,
          netAdditionalCost: 105,
        },
      },
    });
    expect(manifest.summary.artifactCount).toBe(manifest.artifacts.length);
    expect(artifactById(manifest, "artifact_invoice_input_json")).toMatchObject({
      role: "source",
      path: portableRelativePath(runPath, sourceFile),
      format: "json",
      mediaType: "application/json",
    });
    expect(artifactById(manifest, "artifact_spread_result_json")).toMatchObject({
      role: "output",
      path: "spread-result.json",
      format: "json",
      mediaType: "application/json",
    });
    expect(
      artifactById(manifest, "artifact_moby_run_manifest_json"),
    ).toMatchObject({
      role: "manifest",
      path: "moby-run-manifest.json",
      format: "json",
      mediaType: "application/json",
    });
  });
});

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "invoice-cost-spreader-"));
  tempDirs.push(dir);
  return dir;
}

function runCli(args: string[]): Promise<CliResult> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [tsxCliPath, cliPath, ...args],
      {
        cwd: projectRoot,
        encoding: "utf8",
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        resolve({
          code: getExitCode(error),
          stdout,
          stderr,
        });
      },
    );
  });
}

function getExitCode(error: unknown): number {
  if (!error) {
    return 0;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "number"
  ) {
    return (error as { code: number }).code;
  }

  return 1;
}

async function expectFile(filePath: string): Promise<void> {
  await expect(access(filePath, constants.F_OK)).resolves.toBeUndefined();
}

async function expectMissing(filePath: string): Promise<void> {
  await expect(access(filePath, constants.F_OK)).rejects.toMatchObject({
    code: "ENOENT",
  });
}

function artifactById(
  manifest: MobyRunManifestSidecar,
  artifactId: string,
) {
  return manifest.artifacts.find((artifact) => artifact.id === artifactId);
}

function portableRelativePath(fromDir: string, toPath: string): string {
  return path.relative(fromDir, toPath).replace(/\\/g, "/");
}
