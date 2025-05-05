/**
 * GlobeVisualizer - 3D globe visualization component using Three.js
 * 
 * This component creates a 3D globe visualization showing IBM Cloud regions
 * and the network paths between them.
 */
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { NetworkGraph } from '@utils/network/NetworkGraph';
import { Path } from '@types/network';
import { categorizeLatency, LatencyCategory } from '@utils/formatters';
import { getCoordinatesFor, DEFAULT_COORDINATES, hasCoordinatesData, initializeCoordinates } from '@utils/coordsHelper';

interface GlobeVisualizerProps {
  graph: NetworkGraph | null;
  paths: Path[];
  longestPath: Path | null;
  longestPathBetween: Path | null;
  sourceRegion: string | null;
  targetRegion: string | null;
}

export const GlobeVisualizer: React.FC<GlobeVisualizerProps> = ({
  graph,
  paths,
  longestPath,
  longestPathBetween,
  sourceRegion,
  targetRegion,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const globeRef = useRef<THREE.Mesh | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const pathsGroupRef = useRef<THREE.Group | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [coordsLoaded, setCoordsLoaded] = useState(hasCoordinatesData());

  // Load coordinates data on mount if not already loaded
  useEffect(() => {
    if (!hasCoordinatesData()) {
      initializeCoordinates()
        .then(() => {
          console.log('Coordinates data loaded for GlobeVisualizer');
          setCoordsLoaded(true);
        })
        .catch(error => {
          console.error('Failed to initialize coordinates data:', error);
        });
    }
  }, []);

  // Function to convert latitude and longitude to 3D position
  const latLongToVector3 = (lat: number, long: number, radius: number = 100): THREE.Vector3 => {
    // Convert to radians
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (long + 180) * (Math.PI / 180);

    // Convert to Cartesian coordinates
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
  };

  // Create the globe and scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Get container dimensions
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    sceneRef.current = scene;

    // Setup camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 300);
    cameraRef.current = camera;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup controls for camera
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = false;
    controlsRef.current = controls;

    // Create groups for markers and paths
    const markersGroup = new THREE.Group();
    scene.add(markersGroup);
    markersGroupRef.current = markersGroup;

    const pathsGroup = new THREE.Group();
    scene.add(pathsGroup);
    pathsGroupRef.current = pathsGroup;

    // Create globe
    const earthGeometry = new THREE.SphereGeometry(100, 64, 64);
    
    // Load earth texture (optional - can be enhanced or removed)
    const textureLoader = new THREE.TextureLoader();
    
    const earthMaterial = new THREE.MeshStandardMaterial({
      color: 0x3b82f6, // Blue color for the globe
      transparent: true,
      opacity: 0.6,
      roughness: 0.8,
      metalness: 0.1
    });
    
    const globe = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(globe);
    globeRef.current = globe;
    
    // Add wireframe
    const wireframeGeometry = new THREE.WireframeGeometry(earthGeometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: 0x4b5563,
      opacity: 0.3,
      transparent: true
    });
    const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
    globe.add(wireframe);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(200, 200, 200);
    scene.add(directionalLight);

    // Animation function
    const animate = () => {
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animate();
    
    // Indicate that initialization is complete
    setIsReady(true);

    // Clean up
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (rendererRef.current && rendererRef.current.domElement && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      if (globeRef.current) {
        globeRef.current.geometry.dispose();
        if (Array.isArray(globeRef.current.material)) {
          globeRef.current.material.forEach(material => material.dispose());
        } else {
          globeRef.current.material.dispose();
        }
      }
      
      if (sceneRef.current) {
        while(sceneRef.current.children.length > 0) { 
          const object = sceneRef.current.children[0];
          sceneRef.current.remove(object);
        }
      }
      
      rendererRef.current?.dispose();
    };
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      
      rendererRef.current.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update markers and paths when data changes
  useEffect(() => {
    if (!isReady || !markersGroupRef.current || !pathsGroupRef.current || !graph || !coordsLoaded) return;
    
    const markersGroup = markersGroupRef.current;
    const pathsGroup = pathsGroupRef.current;
    
    // Clear existing markers and paths
    while (markersGroup.children.length > 0) {
      const object = markersGroup.children[0];
      markersGroup.remove(object);
    }
    
    while (pathsGroup.children.length > 0) {
      const object = pathsGroup.children[0];
      pathsGroup.remove(object);
    }
    
    // Get all regions
    const allRegions = graph.getRegions();
    
    // Add markers for each region
    allRegions.forEach(region => {
      const coordinates = getCoordinatesFor(region);
      const position = latLongToVector3(coordinates[0], coordinates[1]);
      
      // Determine if this region is in any of the highlighted paths
      let isHighlighted = false;
      let groupType = 0; // Default
      
      if (region === sourceRegion) {
        isHighlighted = true;
        groupType = 1; // Source
      } else if (region === targetRegion) {
        isHighlighted = true;
        groupType = 2; // Target
      } else {
        // Check if in any paths
        const allPaths = [...paths];
        if (longestPath) allPaths.push(longestPath);
        if (longestPathBetween) allPaths.push(longestPathBetween);
        
        for (const path of allPaths) {
          if (path.route.includes(region)) {
            isHighlighted = true;
            
            // Determine the path type
            if (path === longestPath) {
              groupType = 3; // Overall longest path
            } else if (path === longestPathBetween) {
              groupType = 6; // Longest path between
            } else if (path === paths[0]) {
              groupType = 4; // Fastest path
            } else {
              groupType = 5; // Other path
            }
            
            break;
          }
        }
      }
      
      // Create marker geometry (different sizes for different regions)
      const markerGeometry = new THREE.SphereGeometry(isHighlighted ? 1.5 : 1, 16, 16);
      
      // Create marker material (different colors for different region types)
      let markerColor = 0x94a3b8; // Default color for non-highlighted regions
      
      if (isHighlighted) {
        switch(groupType) {
          case 1: markerColor = 0x10b981; break; // Green for source
          case 2: markerColor = 0xef4444; break; // Red for target
          case 3: markerColor = 0xef4444; break; // Red for overall longest path
          case 4: markerColor = 0x10b981; break; // Green for fastest path
          case 5: markerColor = 0x3b82f6; break; // Blue for alternative paths
          case 6: markerColor = 0xf59e0b; break; // Orange for longest path between selected
          default: markerColor = 0x8b5cf6; break; // Purple for default
        }
      }
      
      const markerMaterial = new THREE.MeshLambertMaterial({ color: markerColor });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      
      // Position the marker
      marker.position.copy(position);
      
      // Create label
      const fontSize = isHighlighted ? 20 : 16;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = 256;
      canvas.height = 128;
      
      context.font = `${fontSize}px Arial`;
      context.fillStyle = 'white';
      context.textAlign = 'center';
      context.fillText(region, 128, 64);
      
      const labelTexture = new THREE.CanvasTexture(canvas);
      const labelMaterial = new THREE.SpriteMaterial({ 
        map: labelTexture,
        transparent: true,
        opacity: isHighlighted ? 1 : 0.7
      });
      
      const label = new THREE.Sprite(labelMaterial);
      label.position.copy(position);
      label.position.multiplyScalar(1.05); // Move slightly away from the globe
      label.scale.set(20, 10, 1);
      
      // Add to markers group
      markersGroup.add(marker);
      markersGroup.add(label);
      
      // Store data about the marker for later use if needed
      marker.userData = { region };
    });
    
    // Add paths
    const allPaths = [...paths];
    if (longestPath) allPaths.push(longestPath);
    if (longestPathBetween) allPaths.push(longestPathBetween);
    
    allPaths.forEach(path => {
      const { route } = path;
      
      // Determine path color
      let pathColor = 0x3b82f6; // Default blue
      
      if (path === longestPath) {
        pathColor = 0xef4444; // Red for overall longest
      } else if (path === longestPathBetween) {
        pathColor = 0xf59e0b; // Orange for longest between
      } else if (path === paths[0]) {
        pathColor = 0x10b981; // Green for fastest
      }
      
      // Draw path segments
      for (let i = 0; i < route.length - 1; i++) {
        const startRegion = route[i];
        const endRegion = route[i + 1];
        
        const startCoords = getCoordinatesFor(startRegion);
        const endCoords = getCoordinatesFor(endRegion);
        
        const startPos = latLongToVector3(startCoords[0], startCoords[1]);
        const endPos = latLongToVector3(endCoords[0], endCoords[1]);
        
        // Draw a curved line between the points
        const startVector = startPos.clone().normalize();
        const endVector = endPos.clone().normalize();
        
        // Determine the midpoint and raise it above the surface
        const midVector = new THREE.Vector3().addVectors(startVector, endVector).normalize();
        const distance = startPos.distanceTo(endPos);
        const elevation = 1.0 + distance * 0.02; // Higher curve for longer distances
        
        // Create a curved path using a quadratic bezier
        const curve = new THREE.QuadraticBezierCurve3(
          startPos,
          midVector.multiplyScalar(100 * elevation), // Control point above the surface
          endPos
        );
        
        // Create the tube geometry along the curve
        const tubeGeometry = new THREE.TubeGeometry(curve, 32, 0.3, 8, false);
        const tubeMaterial = new THREE.MeshBasicMaterial({ 
          color: pathColor,
          transparent: true,
          opacity: 0.7
        });
        
        const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
        
        // Add to paths group
        pathsGroup.add(tube);
        
        // Add animated particles for data flow
        if (path === paths[0] || path === longestPath || path === longestPathBetween) {
          const particleCount = Math.ceil(distance / 15); // More particles for longer paths
          const particleGeometry = new THREE.SphereGeometry(0.5, 8, 8);
          const particleMaterial = new THREE.MeshBasicMaterial({ 
            color: pathColor,
            transparent: true,
            opacity: 0.8
          });
          
          for (let p = 0; p < particleCount; p++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Position along the curve
            const initialT = p / particleCount;
            particle.position.copy(curve.getPoint(initialT));
            
            // Add to paths group
            pathsGroup.add(particle);
            
            // Animate by updating position
            // Store animation data in userData
            particle.userData = {
              curve,
              speed: 0.005 * (path === paths[0] ? 2 : 1), // Faster for shortest path
              t: initialT,
              direction: 1
            };
          }
        }
      }
    });
    
    // Setup animation of particles
    const animateParticles = () => {
      // Update all particles
      pathsGroup.children.forEach(child => {
        if (child.userData && child.userData.curve) {
          const { curve, speed, t, direction } = child.userData;
          
          // Update position along the curve
          const newT = t + (speed * direction);
          
          // Reverse direction at ends or loop back to start
          if (newT >= 1) {
            child.userData.t = 0; // Loop back to start
          } else if (newT <= 0) {
            child.userData.direction = 1; // Reverse direction
            child.userData.t = 0;
          } else {
            child.userData.t = newT;
          }
          
          // Update position
          child.position.copy(curve.getPoint(child.userData.t));
        }
      });
    };
    
    // Add the animation to the animation loop
    const originalAnimate = animationRef.current;
    
    const newAnimate = () => {
      if (originalAnimate) {
        cancelAnimationFrame(originalAnimate);
      }
      
      animateParticles();
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      
      animationRef.current = requestAnimationFrame(newAnimate);
    };
    
    animationRef.current = requestAnimationFrame(newAnimate);
    
    // Clean up
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isReady, graph, paths, longestPath, longestPathBetween, sourceRegion, targetRegion, coordsLoaded]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[600px]"
      style={{ position: 'relative' }}
    >
      {(!isReady || !coordsLoaded) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 z-10">
          <div className="text-primary-600 font-medium">
            <svg className="animate-spin h-8 w-8 mr-2 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading 3D Globe...
          </div>
        </div>
      )}
      
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-md shadow-md text-sm z-10">
        <h3 className="font-semibold mb-2 text-secondary-800">Globe Legend</h3>
        <div className="grid grid-cols-1 gap-1">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-green-600 mr-2"></span>
            <span>Source Region / Fastest Path</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-red-600 mr-2"></span>
            <span>Target Region / Longest Path</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-2"></span>
            <span>Longest Path Between Selected</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-600 mr-2"></span>
            <span>Alternative Paths</span>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4 bg-white p-3 rounded-md shadow-md text-sm z-10">
        <div className="font-semibold mb-1 text-secondary-800">Controls</div>
        <div className="text-secondary-600">
          <div>Drag to rotate</div>
          <div>Scroll to zoom</div>
        </div>
      </div>
    </div>
  );
};