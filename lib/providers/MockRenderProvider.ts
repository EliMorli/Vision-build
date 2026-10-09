import { RenderProvider, RenderProgress } from "./RenderProvider";

interface MockJob {
  id: string;
  originalImageUrl: string;
  stylePrompt: string;
  count: number;
  imageUrls: string[];
  currentStatus: "idle" | "generating" | "complete" | "error";
  generatedCount: number;
  startTime: number;
}

/**
 * Mock render provider that simulates progressive image generation
 * Each image takes ~3 seconds to generate, appearing one by one
 */
export class MockRenderProvider implements RenderProvider {
  private jobs = new Map<string, MockJob>();
  private readonly IMAGE_GENERATION_TIME = 3000; // 3 seconds per image

  async generate(
    originalImageUrl: string,
    stylePrompt: string,
    count: number = 4
  ): Promise<string> {
    const jobId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const job: MockJob = {
      id: jobId,
      originalImageUrl,
      stylePrompt,
      count,
      imageUrls: [],
      currentStatus: "generating",
      generatedCount: 0,
      startTime: Date.now(),
    };

    this.jobs.set(jobId, job);

    // Start background "generation" process
    this.simulateGeneration(jobId);

    return jobId;
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

    return {
      generatedCount: job.generatedCount,
      totalCount: job.count,
      currentStatus: job.currentStatus,
      imageUrls: [...job.imageUrls],
    };
  }

  async cancel(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.currentStatus = "idle";
      this.jobs.delete(jobId);
    }
  }

  private async simulateGeneration(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    for (let i = 0; i < job.count; i++) {
      // Wait for "generation time"
      await new Promise((resolve) => setTimeout(resolve, this.IMAGE_GENERATION_TIME));

      // Check if job was cancelled
      if (!this.jobs.has(jobId)) return;

      // Generate placeholder image URL with a color based on index
      const colors = ["1A73E8", "34A853", "FBBC04", "EA4335"];
      const color = colors[i % colors.length];
      const mockImageUrl = `https://placehold.co/1024x1024/${color}/FFFFFF?text=Design+${i + 1}`;

      job.imageUrls.push(mockImageUrl);
      job.generatedCount = i + 1;

      // Mark complete when all done
      if (job.generatedCount === job.count) {
        job.currentStatus = "complete";
      }
    }
  }
}

// Singleton instance
export const mockRenderProvider = new MockRenderProvider();
