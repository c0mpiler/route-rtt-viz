declare module "Dashboard" {
  import React from "react";
  import { NetworkGraph } from "@utils/network/NetworkGraph";
  import { Path } from "@hooks/useNetworkGraph";

  export interface DashboardProps {
    graph: NetworkGraph | null;
    sourceRegion: string | null;
    targetRegion: string | null;
    shortestPaths: Path[];
    longestPathBetweenSelection: Path | null;
    longestPath: Path | null;
    maxLatency: number;
    onRecalculate: () => void;
    onOverallLongestPathSelected: () => void;
    onSelectionReset: () => void;
  }

  export const Dashboard: React.FC<DashboardProps>;
}
