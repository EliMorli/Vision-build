// Interface for swappable image generation providers
export interface RenderProgress {
  generatedCount: number;
  totalCount: number;
  currentStatus: "idle" | "generating" | "complete" | "error";
  imageUrls: string[];
  error?: string;
}

export interface RenderProvider {
  /**
   * Start generating designs based on the original image and style prompt
   * @param originalImageUrl - URL of the original room photo
   * @param stylePrompt - Style description/modifier
   * @param count - Number of designs to generate (default 4)
   * @returns A unique job ID to track progress
   */
  generate(
    originalImageUrl: string,
    stylePrompt: string,
    count?: number
  ): Promise<string>;

  /**
   * Get the current progress of a generation job
   * @param jobId - The job ID returned from generate()
   */
  getProgress(jobId: string): Promise<RenderProgress>;

  /**
   * Cancel a running generation job
   * @param jobId - The job ID to cancel
   */
  cancel(jobId: string): Promise<void>;
}
