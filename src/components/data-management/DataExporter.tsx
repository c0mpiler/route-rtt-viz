/**
 * DataExporter - Component for exporting path analysis and visualizations
 *
 * This component provides functionality to export:
 * - Path analysis data to CSV/JSON
 * - Network visualizations as images
 * - Comprehensive reports in multiple formats
 */
import React, { useCallback, useState } from "react";
import { Path } from "@types/network";
import { formatLatency, formatRoute } from "@utils/formatters";

interface DataExporterProps {
  paths: Path[];
  selectedRegions: { source: string; target: string } | null;
  networkData: Record<string, Record<string, number>>;
  visualizationRef?: React.RefObject<SVGSVGElement>;
}

type ExportFormat = "csv" | "json" | "png" | "pdf";

const DataExporter: React.FC<DataExporterProps> = ({
  paths,
  selectedRegions,
  networkData,
  visualizationRef,
}) => {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const generateCSV = useCallback(() => {
    // Generate CSV for path analysis
    const headers = [
      "Path Type",
      "Route",
      "Total Latency (ms)",
      "Hops",
      "Average per Hop (ms)",
      "Source",
      "Destination",
      "Hop Detail Source",
      "Hop Detail Target",
      "Hop Detail RTT",
      "Hop Detail Min RTT",
    ];

    const rows: string[][] = [headers];

    paths.forEach((path, index) => {
      const pathType =
        index === 0
          ? "Fastest"
          : index === paths.length - 1
            ? "Longest"
            : `Alternative ${index}`;

      const routeStr = formatRoute(path.route);
      const avgPerHop = path.hops > 0 ? path.latency / path.hops : 0;

      if (path.hopDetails && path.hopDetails.length > 0) {
        path.hopDetails.forEach((hopDetail) => {
          rows.push([
            pathType,
            routeStr,
            path.latency.toString(),
            path.hops.toString(),
            avgPerHop.toFixed(1),
            path.route[0] || "",
            path.route[path.route.length - 1] || "",
            hopDetail.source,
            hopDetail.target,
            hopDetail.rtt.toString(),
            hopDetail.minRtt.toString(),
          ]);
        });
      } else {
        rows.push([
          pathType,
          routeStr,
          path.latency.toString(),
          path.hops.toString(),
          avgPerHop.toFixed(1),
          path.route[0] || "",
          path.route[path.route.length - 1] || "",
          "",
          "",
          "",
          "", // Empty hop details
        ]);
      }
    });

    return rows.map((row) => row.join(",")).join("\n");
  }, [paths]);

  const generateJSON = useCallback(() => {
    // Generate JSON for complete path analysis
    const exportData = {
      timestamp: new Date().toISOString(),
      request: selectedRegions,
      paths: paths.map((path, index) => ({
        rank: index + 1,
        type:
          index === 0
            ? "fastest"
            : index === paths.length - 1
              ? "longest"
              : "alternative",
        route: path.route,
        latency: path.latency,
        hops: path.hops,
        averagePerHop: path.hops > 0 ? path.latency / path.hops : 0,
        hopDetails: path.hopDetails?.map((hop) => ({
          source: hop.source,
          target: hop.target,
          rtt: hop.rtt,
          minRtt: hop.minRtt,
        })),
      })),
      networkSummary: {
        totalRegions: Object.keys(networkData).length,
        totalConnections: Object.values(networkData).reduce(
          (sum, destinations) => sum + Object.keys(destinations).length,
          0,
        ),
      },
    };

    return JSON.stringify(exportData, null, 2);
  }, [paths, selectedRegions, networkData]);

  const exportToSVG = async (): Promise<string> => {
    if (!visualizationRef?.current) {
      throw new Error("No visualization reference available");
    }

    // Clone the SVG to avoid modifying the original
    const svg = visualizationRef.current.cloneNode(true) as SVGSVGElement;

    // Set viewBox if not already set
    if (!svg.hasAttribute("viewBox")) {
      const bbox = svg.getBoundingClientRect();
      svg.setAttribute("viewBox", `0 0 ${bbox.width} ${bbox.height}`);
    }

    // Add namespaces if not present
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

    return new XMLSerializer().serializeToString(svg);
  };

  const exportToPNG = async (): Promise<void> => {
    const svgString = await exportToSVG();

    // Create a canvas to render the SVG
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    const img = new Image();
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    return new Promise((resolve, reject) => {
      img.onload = () => {
        canvas.width = img.width * 2; // 2x for better quality
        canvas.height = img.height * 2;
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);

        // Convert to PNG
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to create PNG"));
              return;
            }

            // Download the file
            const a = document.createElement("a");
            a.download = `route-rtt-viz-export-${Date.now()}.png`;
            a.href = URL.createObjectURL(blob);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            URL.revokeObjectURL(url);
            resolve();
          },
          "image/png",
          0.95,
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load SVG image"));
      };

      img.src = url;
    });
  };

  const generatePDFReport = useCallback(async () => {
    // Create a comprehensive HTML report for PDF conversion
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Route Radar Analysis Report</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #ddd;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #2563eb;
            margin-bottom: 10px;
          }
          .section {
            margin-bottom: 40px;
          }
          .section h2 {
            color: #1f2937;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 10px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          .summary-card {
            background: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
          }
          .path-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .path-table th, .path-table td {
            border: 1px solid #e5e7eb;
            padding: 12px;
            text-align: left;
          }
          .path-table th {
            background: #f9fafb;
            font-weight: 600;
          }
          .route {
            font-family: monospace;
            background: #f9fafb;
            padding: 4px 8px;
            border-radius: 4px;
          }
          .timestamp {
            font-size: 0.9em;
            color: #6b7280;
            text-align: center;
            margin-top: 40px;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Route Radar Analysis Report</h1>
          ${
            selectedRegions
              ? `
            <p>Route Analysis: ${selectedRegions.source} → ${selectedRegions.target}</p>
          `
              : ""
          }
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>

        <div class="section">
          <h2>Executive Summary</h2>
          <div class="summary-grid">
            <div class="summary-card">
              <h3>Network Overview</h3>
              <p><strong>Total Regions:</strong> ${Object.keys(networkData).length}</p>
              <p><strong>Total Connections:</strong> ${Object.values(
                networkData,
              ).reduce(
                (sum, destinations) => sum + Object.keys(destinations).length,
                0,
              )}</p>
            </div>
            <div class="summary-card">
              <h3>Path Analysis</h3>
              <p><strong>Paths Found:</strong> ${paths.length}</p>
              <p><strong>Fastest Route:</strong> ${formatLatency(paths[0]?.latency || 0)}</p>
              <p><strong>Slowest Route:</strong> ${formatLatency(paths[paths.length - 1]?.latency || 0)}</p>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Detailed Path Analysis</h2>
          <table class="path-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Type</th>
                <th>Route</th>
                <th>Total RTT</th>
                <th>Hops</th>
                <th>Avg per Hop</th>
              </tr>
            </thead>
            <tbody>
              ${paths
                .map(
                  (path, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${
                    index === 0
                      ? "Fastest"
                      : index === paths.length - 1
                        ? "Slowest"
                        : "Alternative"
                  }</td>
                  <td class="route">${formatRoute(path.route)}</td>
                  <td>${formatLatency(path.latency)}</td>
                  <td>${path.hops}</td>
                  <td>${path.hops > 0 ? formatLatency(path.latency / path.hops) : "N/A"}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>

        ${paths
          .map(
            (path, index) => `
          <div class="section">
            <h2>Path ${index + 1} Details</h2>
            <h3>${formatRoute(path.route)}</h3>
            ${
              path.hopDetails && path.hopDetails.length > 0
                ? `
              <table class="path-table">
                <thead>
                  <tr>
                    <th>Hop</th>
                    <th>Source</th>
                    <th>Destination</th>
                    <th>RTT</th>
                    <th>Min RTT</th>
                  </tr>
                </thead>
                <tbody>
                  ${path.hopDetails
                    .map(
                      (hop, hopIndex) => `
                    <tr>
                      <td>${hopIndex + 1}</td>
                      <td>${hop.source}</td>
                      <td>${hop.target}</td>
                      <td>${hop.rtt.toFixed(1)} ms</td>
                      <td>${hop.minRtt.toFixed(1)} ms</td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>
            `
                : "<p>No detailed hop information available for this path.</p>"
            }
          </div>
        `,
          )
          .join("")}

        <div class="timestamp">
          Report generated by Route Radar v1.0.0
        </div>
      </body>
      </html>
    `;

    // Create a new window to print as PDF
    const printWindow = window.open("", "_blank");
    if (!printWindow) throw new Error("Failed to open print window");

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Trigger the print dialog
    printWindow.onload = () => {
      printWindow.print();
      setTimeout(() => printWindow.close(), 100);
    };
  }, [paths, selectedRegions, networkData]);

  const handleExport = async (format: ExportFormat) => {
    setExporting(format);

    try {
      let content: string | void;
      let filename: string;
      let mimeType: string;

      switch (format) {
        case "csv":
          content = generateCSV();
          filename = `route-rtt-viz-export-${Date.now()}.csv`;
          mimeType = "text/csv";
          break;

        case "json":
          content = generateJSON();
          filename = `route-rtt-viz-export-${Date.now()}.json`;
          mimeType = "application/json";
          break;

        case "png":
          await exportToPNG();
          return; // PNG has its own download logic

        case "pdf":
          await generatePDFReport();
          return; // PDF uses print dialog
      }

      if (content) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.download = filename;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Export failed:", error);
      // You might want to show this error to the user
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => handleExport("csv")}
          disabled={exporting !== null}
          className={`flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium ${
            exporting === "csv"
              ? "bg-secondary-400 text-white cursor-not-allowed"
              : "bg-primary-600 text-white hover:bg-primary-700"
          }`}
        >
          {exporting === "csv" ? (
            <>
              <div className="animate-spin -ml-1 mr-3 h-5 w-5 text-white">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              Exporting...
            </>
          ) : (
            <>
              <svg
                className="-ml-1 mr-2 h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export CSV
            </>
          )}
        </button>

        <button
          onClick={() => handleExport("json")}
          disabled={exporting !== null}
          className={`flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium ${
            exporting === "json"
              ? "bg-secondary-400 text-white cursor-not-allowed"
              : "bg-primary-600 text-white hover:bg-primary-700"
          }`}
        >
          {exporting === "json" ? (
            <>
              <div className="animate-spin -ml-1 mr-3 h-5 w-5 text-white">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              Exporting...
            </>
          ) : (
            <>
              <svg
                className="-ml-1 mr-2 h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
              Export JSON
            </>
          )}
        </button>

        <button
          onClick={() => handleExport("png")}
          disabled={exporting !== null || !visualizationRef?.current}
          className={`flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium ${
            exporting === "png" || !visualizationRef?.current
              ? "bg-secondary-400 text-white cursor-not-allowed"
              : "bg-primary-600 text-white hover:bg-primary-700"
          }`}
        >
          {exporting === "png" ? (
            <>
              <div className="animate-spin -ml-1 mr-3 h-5 w-5 text-white">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              Exporting...
            </>
          ) : (
            <>
              <svg
                className="-ml-1 mr-2 h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Export PNG
            </>
          )}
        </button>

        <button
          onClick={() => handleExport("pdf")}
          disabled={exporting !== null}
          className={`flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium ${
            exporting === "pdf"
              ? "bg-secondary-400 text-white cursor-not-allowed"
              : "bg-primary-600 text-white hover:bg-primary-700"
          }`}
        >
          {exporting === "pdf" ? (
            <>
              <div className="animate-spin -ml-1 mr-3 h-5 w-5 text-white">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              Generating...
            </>
          ) : (
            <>
              <svg
                className="-ml-1 mr-2 h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              Export PDF
            </>
          )}
        </button>
      </div>

      {!visualizationRef?.current && (
        <p className="text-sm text-secondary-600 text-center">
          PNG export will be available when a visualization is active
        </p>
      )}
    </div>
  );
};

export default DataExporter;
