import { RenderProvider, RenderProgress } from "./RenderProvider";
import { supabase } from "@/lib/supabase";

interface ReplicateJob {
  id: string;
  projectId: string;
  progress: RenderProgress;
}

/**
 * Replicate/SDXL render provider - calls the existing Supabase edge function
 * This maintains compatibility with the existing backend
 */
export class ReplicateRenderProvider implements RenderProvider {
  private jobs = new Map<string, ReplicateJob>();

  async generate(
    originalImageUrl: string,
    stylePrompt: string,
    count: number = 4
  ): Promise<string> {
    // For now, this would call the existing generate-design edge function
    // The actual implementation would need a projectId, so this is a stub
    throw new Error(
      "ReplicateRenderProvider.generate() requires migration to support direct calls. Use project store for now."
    );
  }

  async getProgress(jobId: string): Promise<RenderProgress> {
    const job = this.jobs.get(jobId);

    if (!job) {
      return {
        generatedCount: 0,
        totalCount: 4,
        currentStatus: "error",
        imageUrls: [],
        error: "Job not found",
      };
    }

    return job.progress;
  }

  async cancel(jobId: string): Promise<void> {
    this.jobs.delete(jobId);
  }

  /**
   * Helper method to track a project-based generation
   * This bridges the old edge function approach with the new provider interface
   */
  trackProjectGeneration(projectId: string, imageUrls: string[]): void {
    const jobId = `replicate-${projectId}`;
    this.jobs.set(jobId, {
      id: jobId,
      projectId,
      progress: {
        generatedCount: imageUrls.length,
        totalCount: 4,
        currentStatus: imageUrls.length === 4 ? "complete" : "generating",
        imageUrls,
      },
    });
  }
}

export const replicateRenderProvider = new ReplicateRenderProvider();
