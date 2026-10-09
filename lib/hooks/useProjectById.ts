import { useEffect, useState } from "react";
import { useProjectStore } from "@/lib/store";
import type { Project } from "@/lib/types";

/**
 * Resolve a project by route id.
 *
 * Screens reached by deep link or a page refresh (editor, results) used to
 * depend on `currentProject` having been set by the previous screen. This hook
 * looks in `currentProject` and the projects list, fetches projects once if the
 * id is unknown, and keeps `currentProject` in sync so store actions such as
 * generateDesigns operate on the right project.
 */
export function useProjectById(id: string | undefined) {
  const currentProject = useProjectStore((s) => s.currentProject);
  const projects = useProjectStore((s) => s.projects);
  const loading = useProjectStore((s) => s.loading);
  const storeError = useProjectStore((s) => s.error);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  // Which id we already requested a fetch for (state, so render output updates)
  const [requestedId, setRequestedId] = useState<string | undefined>(undefined);
  const attempted = requestedId === id;

  const project: Project | null =
    (currentProject && currentProject.id === id ? currentProject : null) ??
    projects.find((p) => p.id === id) ??
    null;

  useEffect(() => {
    if (!id || project || attempted) return;
    let cancelled = false;
    // Defer the state update out of the effect body; fetchProjects flips `loading`
    Promise.resolve().then(() => {
      if (cancelled) return;
      setRequestedId(id);
      fetchProjects();
    });
    return () => {
      cancelled = true;
    };
  }, [id, project, attempted, fetchProjects]);

  useEffect(() => {
    if (project && currentProject?.id !== project.id) {
      setCurrentProject(project);
    }
  }, [project, currentProject, setCurrentProject]);

  const retry = () => {
    setRequestedId(id);
    fetchProjects();
  };

  return {
    project,
    // Still resolving: either the first fetch hasn't started yet or it is in flight
    resolving: !project && (!attempted || loading),
    notFound: !project && attempted && !loading,
    failed: !project && !!storeError && !loading,
    retry,
  };
}
