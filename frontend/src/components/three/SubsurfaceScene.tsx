import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "./OrbitControls";
import type {
  DemoProspect,
  Demo3DScene,
  DecisionComparison,
  Infrastructure3D,
  GeologicalLayer,
  CameraPreset,
} from "../../types/demo";
import type { DecisionType } from "../../types/portfolio";
import { DECISION_COLORS } from "../../lib/constants";

interface SubsurfaceSceneProps {
  prospects: DemoProspect[];
  scene3d: Demo3DScene;
  decisions: Record<string, DecisionType>;
  selectedProspectId?: string | null;
  onSelectProspect?: (id: string) => void;
  compact?: boolean;
  filterProspectIds?: string[];
}

function latLonToScene(
  lat: number,
  lon: number,
  bounds: Demo3DScene["bounds"],
  sceneWidth: number,
  sceneDepthZ: number
): [number, number] {
  const x = ((lon - bounds.lon_min) / (bounds.lon_max - bounds.lon_min) - 0.5) * sceneWidth;
  const z = ((bounds.lat_max - lat) / (bounds.lat_max - bounds.lat_min) - 0.5) * sceneDepthZ;
  return [x, z];
}

function depthToY(depth_ft: number, maxDepth: number, sceneHeight: number): number {
  return -(depth_ft / maxDepth) * sceneHeight;
}

export function SubsurfaceScene({
  prospects,
  scene3d,
  decisions,
  selectedProspectId,
  onSelectProspect,
  compact = false,
  filterProspectIds,
}: SubsurfaceSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const prospectMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const animFrameRef = useRef<number>(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [layers, setLayers] = useState({
    surface: true,
    geology: true,
    infrastructure: true,
    tiebacks: true,
    halos: true,
    labels: true,
  });

  const SCENE_WIDTH = compact ? 40 : 80;
  const SCENE_DEPTH = compact ? 40 : 80;
  const SCENE_HEIGHT = compact ? 30 : 60;
  const maxDepth = Math.max(...scene3d.prospect_3d.map((p) => p.target_depth_ft), 35000);

  const visibleProspects = filterProspectIds
    ? prospects.filter((p) => filterProspectIds.includes(p.prospect_id))
    : prospects;

  const createScene = useCallback(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0B1017");
    scene.fog = new THREE.FogExp2("#0B1017", compact ? 0.008 : 0.004);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 500);
    const preset = scene3d.camera_presets.perspective;
    camera.position.set(preset.position[0], preset.position[1], preset.position[2]);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(preset.target[0], preset.target[1], preset.target[2]);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 200;
    controls.minDistance = 5;
    controls.update();
    controlsRef.current = controls;

    // Lighting
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(30, 50, 20);
    directional.castShadow = true;
    scene.add(directional);
    const pointLight = new THREE.PointLight(0x2FA7FF, 0.3, 100);
    pointLight.position.set(0, 20, 0);
    scene.add(pointLight);

    // Grid helper at surface
    const grid = new THREE.GridHelper(SCENE_WIDTH, 20, 0x1a2840, 0x0d1520);
    scene.add(grid);

    buildSurface(scene);
    buildGeologicalLayers(scene);
    buildProspects(scene);
    buildInfrastructure(scene);
    buildTiebacks(scene);
    buildDepthScale(scene);

    // Animation loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [scene3d, compact]);

  const buildSurface = (scene: THREE.Scene) => {
    if (scene3d.scene_type === "offshore") {
      // Water surface
      const waterGeo = new THREE.PlaneGeometry(SCENE_WIDTH * 1.2, SCENE_DEPTH * 1.2, 32, 32);
      const waterMat = new THREE.MeshPhongMaterial({
        color: 0x1565c0,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        shininess: 100,
      });
      const water = new THREE.Mesh(waterGeo, waterMat);
      water.rotation.x = -Math.PI / 2;
      water.position.y = 0.1;
      water.name = "surface";
      scene.add(water);

      // Ocean floor - procedural from water depths
      const floorGeo = new THREE.PlaneGeometry(SCENE_WIDTH * 1.2, SCENE_DEPTH * 1.2, 16, 16);
      const avgDepth = scene3d.prospect_3d.reduce((s, p) => s + (p.water_depth_ft || 0), 0) / scene3d.prospect_3d.length;
      const floorY = depthToY(avgDepth, maxDepth, SCENE_HEIGHT);
      const floorMat = new THREE.MeshPhongMaterial({
        color: 0x2d1b0e,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = floorY;
      floor.name = "surface";
      scene.add(floor);
    } else {
      // Onshore terrain
      const terrainGeo = new THREE.PlaneGeometry(SCENE_WIDTH * 1.2, SCENE_DEPTH * 1.2, 32, 32);
      const positions = terrainGeo.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getY(i);
        positions.setZ(i, Math.sin(x * 0.1) * 0.3 + Math.cos(z * 0.15) * 0.2);
      }
      terrainGeo.computeVertexNormals();
      const terrainMat = new THREE.MeshPhongMaterial({
        color: 0x3d2b1f,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
      const terrain = new THREE.Mesh(terrainGeo, terrainMat);
      terrain.rotation.x = -Math.PI / 2;
      terrain.name = "surface";
      scene.add(terrain);
    }
  };

  const buildGeologicalLayers = (scene: THREE.Scene) => {
    scene3d.geological_layers.forEach((layer: GeologicalLayer) => {
      const y = depthToY(layer.depth_ft, maxDepth, SCENE_HEIGHT);
      const geo = new THREE.PlaneGeometry(SCENE_WIDTH * 1.1, SCENE_DEPTH * 1.1);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(layer.color),
        transparent: true,
        opacity: layer.opacity,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = y;
      mesh.name = "geology";
      scene.add(mesh);

      // Label
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = layer.color;
      ctx.font = "bold 24px Inter, sans-serif";
      ctx.fillText(layer.name, 8, 40);
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.7 });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(-SCENE_WIDTH / 2 + 2, y + 0.5, -SCENE_DEPTH / 2 + 2);
      sprite.scale.set(8, 2, 1);
      sprite.name = "labels";
      scene.add(sprite);
    });
  };

  const buildProspects = (scene: THREE.Scene) => {
    const meshMap = new Map<string, THREE.Group>();
    visibleProspects.forEach((prospect) => {
      const p3d = scene3d.prospect_3d.find((p) => p.prospect_id === prospect.prospect_id);
      if (!p3d) return;

      const [x, z] = latLonToScene(prospect.latitude, prospect.longitude, scene3d.bounds, SCENE_WIDTH, SCENE_DEPTH);
      const targetY = depthToY(p3d.target_depth_ft, maxDepth, SCENE_HEIGHT);
      const surfaceY = scene3d.scene_type === "offshore" && p3d.water_depth_ft
        ? depthToY(p3d.water_depth_ft, maxDepth, SCENE_HEIGHT)
        : 0;

      const decision = decisions[prospect.prospect_id] || "defer";
      const color = new THREE.Color(DECISION_COLORS[decision]);

      const group = new THREE.Group();
      group.userData = { prospectId: prospect.prospect_id, name: prospect.name };

      // Column from surface to target
      const columnHeight = Math.abs(targetY - surfaceY);
      const columnRadius = compact ? 0.2 : Math.max(0.15, (prospect.resource_estimate.p50 / 1000) * 0.4);
      const columnGeo = new THREE.CylinderGeometry(columnRadius * 0.5, columnRadius, columnHeight, 8);
      const columnMat = new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.6, emissive: color, emissiveIntensity: 0.2 });
      const column = new THREE.Mesh(columnGeo, columnMat);
      column.position.set(0, surfaceY - columnHeight / 2, 0);
      group.add(column);

      // Reservoir target sphere
      const sphereRadius = compact ? 0.5 : Math.max(0.3, columnRadius * 1.5);
      const sphereGeo = new THREE.SphereGeometry(sphereRadius, 16, 16);
      const sphereMat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.5 });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.set(0, targetY, 0);
      group.add(sphere);

      // Uncertainty halo
      const p10 = prospect.resource_estimate.p10;
      const p90 = prospect.resource_estimate.p90;
      const uncertainty = (p10 - p90) / Math.max(prospect.resource_estimate.p50, 1);
      const haloRadius = compact ? 0.8 : Math.max(0.5, uncertainty * 1.5);
      const haloGeo = new THREE.SphereGeometry(haloRadius, 16, 16);
      const haloMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.set(0, targetY, 0);
      halo.name = "halos";
      group.add(halo);

      // Surface marker pin
      const pinGeo = new THREE.SphereGeometry(compact ? 0.3 : 0.4, 8, 8);
      const pinMat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.3 });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.set(0, surfaceY + 0.5, 0);
      group.add(pin);

      group.position.set(x, 0, z);
      scene.add(group);
      meshMap.set(prospect.prospect_id, group);
    });
    prospectMeshesRef.current = meshMap;
  };

  const buildInfrastructure = (scene: THREE.Scene) => {
    scene3d.infrastructure.forEach((infra: Infrastructure3D) => {
      const [x, z] = latLonToScene(infra.latitude, infra.longitude, scene3d.bounds, SCENE_WIDTH, SCENE_DEPTH);
      const y = infra.water_depth_ft ? depthToY(infra.water_depth_ft, maxDepth, SCENE_HEIGHT) : 0;

      const group = new THREE.Group();
      group.name = "infrastructure";

      if (infra.type === "fpso") {
        // FPSO as a flat box on water surface
        const geo = new THREE.BoxGeometry(2, 0.6, 0.8);
        const mat = new THREE.MeshPhongMaterial({ color: 0xf5a623, emissive: 0xf5a623, emissiveIntensity: 0.2 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 0.5;
        group.add(mesh);
      } else if (infra.type === "subsea_manifold") {
        // Subsea manifold at depth
        const geo = new THREE.OctahedronGeometry(0.7);
        const mat = new THREE.MeshPhongMaterial({ color: 0x00bcd4, emissive: 0x00bcd4, emissiveIntensity: 0.3 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = y;
        group.add(mesh);
      } else {
        // Platform
        const legGeo = new THREE.CylinderGeometry(0.1, 0.15, Math.abs(y) + 2, 6);
        const legMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.y = y / 2 + 1;
        group.add(leg);

        const deckGeo = new THREE.BoxGeometry(2, 0.4, 1.5);
        const deckMat = new THREE.MeshPhongMaterial({ color: 0xcccccc, emissive: 0xcccccc, emissiveIntensity: 0.1 });
        const deck = new THREE.Mesh(deckGeo, deckMat);
        deck.position.y = 2;
        group.add(deck);
      }

      // Label
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.font = "18px Inter, sans-serif";
      ctx.fillText(infra.name, 4, 38);
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.8 });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.y = 4;
      sprite.scale.set(6, 1.5, 1);
      sprite.name = "labels";
      group.add(sprite);

      group.position.set(x, 0, z);
      scene.add(group);
    });
  };

  const buildTiebacks = (scene: THREE.Scene) => {
    const tiebacks = scene3d.tieback_connections || [];
    tiebacks.forEach((tb) => {
      const prospect = visibleProspects.find((p) => p.prospect_id === tb.from_prospect);
      const infra = scene3d.infrastructure.find((i) => i.name === tb.to_infrastructure);
      if (!prospect || !infra) return;

      const [x1, z1] = latLonToScene(prospect.latitude, prospect.longitude, scene3d.bounds, SCENE_WIDTH, SCENE_DEPTH);
      const [x2, z2] = latLonToScene(infra.latitude, infra.longitude, scene3d.bounds, SCENE_WIDTH, SCENE_DEPTH);

      const p3d = scene3d.prospect_3d.find((p) => p.prospect_id === prospect.prospect_id);
      const y1 = p3d?.water_depth_ft ? depthToY(p3d.water_depth_ft, maxDepth, SCENE_HEIGHT) : 0;
      const y2 = infra.water_depth_ft ? depthToY(infra.water_depth_ft, maxDepth, SCENE_HEIGHT) : 0;

      const points = [new THREE.Vector3(x1, y1, z1), new THREE.Vector3(x2, y2, z2)];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineDashedMaterial({ color: 0x4fc3f7, dashSize: 0.5, gapSize: 0.3, transparent: true, opacity: 0.6 });
      const line = new THREE.Line(geo, mat);
      line.computeLineDistances();
      line.name = "tiebacks";
      scene.add(line);

      // Distance label
      const mid = new THREE.Vector3().addVectors(points[0], points[1]).multiplyScalar(0.5);
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 48;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#4fc3f7";
      ctx.font = "bold 20px Inter, sans-serif";
      ctx.fillText(`${tb.distance_miles} mi`, 4, 30);
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(mid);
      sprite.position.y += 1;
      sprite.scale.set(3, 1, 1);
      sprite.name = "tiebacks";
      scene.add(sprite);
    });
  };

  const buildDepthScale = (scene: THREE.Scene) => {
    const x = SCENE_WIDTH / 2 + 2;
    const z = 0;
    const steps = [0, 5000, 10000, 15000, 20000, 25000, 30000].filter((d) => d <= maxDepth);

    steps.forEach((depth) => {
      const y = depthToY(depth, maxDepth, SCENE_HEIGHT);
      const tick = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x - 0.5, y, z),
          new THREE.Vector3(x + 0.5, y, z),
        ]),
        new THREE.LineBasicMaterial({ color: 0x667788 })
      );
      tick.name = "labels";
      scene.add(tick);

      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 48;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#667788";
      ctx.font = "16px Inter, sans-serif";
      ctx.fillText(`${(depth / 1000).toFixed(0)}k ft`, 4, 30);
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(x + 2, y, z);
      sprite.scale.set(3, 1, 1);
      sprite.name = "labels";
      scene.add(sprite);
    });
  };

  // Initialize scene
  useEffect(() => {
    const cleanup = createScene();
    return cleanup;
  }, [createScene]);

  // Handle layer visibility
  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.traverse((obj) => {
      if (obj.name === "surface") obj.visible = layers.surface;
      if (obj.name === "geology") obj.visible = layers.geology;
      if (obj.name === "infrastructure") obj.visible = layers.infrastructure;
      if (obj.name === "tiebacks") obj.visible = layers.tiebacks;
      if (obj.name === "halos") obj.visible = layers.halos;
      if (obj.name === "labels") obj.visible = layers.labels;
    });
  }, [layers]);

  // Handle selection highlight
  useEffect(() => {
    prospectMeshesRef.current.forEach((group, id) => {
      const isSelected = id === selectedProspectId;
      group.scale.setScalar(isSelected ? 1.3 : 1.0);
    });
    if (selectedProspectId && cameraRef.current && controlsRef.current) {
      const group = prospectMeshesRef.current.get(selectedProspectId);
      if (group) {
        const target = new THREE.Vector3();
        group.getWorldPosition(target);
        controlsRef.current.target.lerp(target, 0.3);
      }
    }
  }, [selectedProspectId]);

  // Mouse interaction
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const allMeshes: THREE.Object3D[] = [];
    prospectMeshesRef.current.forEach((group) => {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) allMeshes.push(child);
      });
    });
    const intersects = raycasterRef.current.intersectObjects(allMeshes);
    if (intersects.length > 0) {
      let parent = intersects[0].object.parent;
      while (parent && !parent.userData?.prospectId) parent = parent.parent;
      setHoveredId(parent?.userData?.prospectId || null);
    } else {
      setHoveredId(null);
    }
  }, []);

  const handleClick = useCallback(() => {
    if (hoveredId && onSelectProspect) onSelectProspect(hoveredId);
  }, [hoveredId, onSelectProspect]);

  const animateToPreset = (presetName: string) => {
    const preset: CameraPreset | undefined = scene3d.camera_presets[presetName];
    if (!preset || !cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    const startPos = cam.position.clone();
    const endPos = new THREE.Vector3(...preset.position);
    const startTarget = ctrl.target.clone();
    const endTarget = new THREE.Vector3(...preset.target);
    let t = 0;
    const step = () => {
      t += 0.03;
      if (t >= 1) {
        cam.position.copy(endPos);
        ctrl.target.copy(endTarget);
        ctrl.update();
        return;
      }
      const ease = t * t * (3 - 2 * t);
      cam.position.lerpVectors(startPos, endPos, ease);
      ctrl.target.lerpVectors(startTarget, endTarget, ease);
      ctrl.update();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const captureView = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    const dataUrl = rendererRef.current.domElement.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = "subsurface-3d-view.png";
    link.href = dataUrl;
    link.click();
  };

  const hoveredProspect = hoveredId ? visibleProspects.find((p) => p.prospect_id === hoveredId) : null;

  return (
    <div className={`relative ${compact ? "h-64" : "h-full"} w-full`}>
      <div
        ref={containerRef}
        className="w-full h-full"
        onPointerMove={handlePointerMove}
        onClick={handleClick}
        style={{ cursor: hoveredId ? "pointer" : "grab" }}
      />

      {/* Camera preset buttons */}
      {!compact && (
        <div className="absolute top-3 left-3 flex gap-1.5">
          {[
            { key: "perspective", label: "Perspective" },
            { key: "top_down", label: "Top Down" },
            { key: "cross_section", label: "Cross Section" },
            { key: "infrastructure_focus", label: "Infrastructure" },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => animateToPreset(p.key)}
              aria-label={`Camera view: ${p.label}`}
              className="px-2 py-1 text-xs rounded bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/50"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Layer toggles */}
      {!compact && (
        <div className="absolute top-3 right-3 flex flex-col gap-1">
          {Object.entries(layers).map(([key, visible]) => (
            <label key={key} className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={visible}
                onChange={() => setLayers((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                className="w-3 h-3"
              />
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </label>
          ))}
        </div>
      )}

      {/* Capture button */}
      {!compact && (
        <button
          onClick={captureView}
          aria-label="Capture 3D view as PNG"
          className="absolute bottom-3 right-3 px-3 py-1.5 text-xs rounded bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/50"
        >
          Capture View
        </button>
      )}

      {/* Tooltip */}
      {hoveredProspect && (
        <div className="absolute bottom-3 left-3 bg-panel/95 border border-slate-700 rounded-lg p-3 text-sm max-w-xs">
          <div className="font-semibold text-slate-100">{hoveredProspect.name}</div>
          <div className="text-slate-400 text-xs mt-1">{hoveredProspect.basin}</div>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: DECISION_COLORS[decisions[hoveredProspect.prospect_id] || "defer"] }}
            />
            <span className="text-xs text-slate-300 capitalize">
              {(decisions[hoveredProspect.prospect_id] || "defer").replace("_", " ")}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            P50 EUR: {hoveredProspect.resource_estimate.p50.toLocaleString()} {hoveredProspect.resource_estimate.unit}
          </div>
        </div>
      )}

      {/* Legend */}
      {!compact && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-panel/80 border border-slate-700/50 rounded px-3 py-1.5 flex gap-4 text-xs text-slate-400">
          {Object.entries(DECISION_COLORS).map(([key, color]) => (
            <span key={key} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              {key.replace("_", " ")}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full border border-slate-500 bg-transparent" style={{ opacity: 0.3 }} />
            uncertainty
          </span>
        </div>
      )}
    </div>
  );
}
