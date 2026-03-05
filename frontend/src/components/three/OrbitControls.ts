/**
 * Minimal OrbitControls for Three.js r128.
 *
 * Three.js r128 ships OrbitControls in the examples directory which isn't
 * available as a proper ES module import without additional build config.
 * This lightweight implementation covers the subset we need: orbit, zoom,
 * pan, and damping.
 */
import * as THREE from "three";

export class OrbitControls {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  target = new THREE.Vector3();
  enableDamping = false;
  dampingFactor = 0.05;
  rotateSpeed = 1.0;
  zoomSpeed = 1.0;
  panSpeed = 1.0;
  minDistance = 1;
  maxDistance = Infinity;
  enabled = true;

  private spherical = new THREE.Spherical();
  private sphericalDelta = new THREE.Spherical();
  private panOffset = new THREE.Vector3();
  private zoomScale = 1;
  private rotateStart = new THREE.Vector2();
  private panStart = new THREE.Vector2();
  private state: "none" | "rotate" | "pan" = "none";

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    domElement.addEventListener("pointerdown", this.onPointerDown);
    domElement.addEventListener("wheel", this.onWheel, { passive: false });
    domElement.addEventListener("contextmenu", (e) => e.preventDefault());

    this.update();
  }

  private onPointerDown = (e: PointerEvent) => {
    if (!this.enabled) return;
    if (e.button === 0) {
      this.state = "rotate";
      this.rotateStart.set(e.clientX, e.clientY);
    } else if (e.button === 2) {
      this.state = "pan";
      this.panStart.set(e.clientX, e.clientY);
    }
    document.addEventListener("pointermove", this.onPointerMove);
    document.addEventListener("pointerup", this.onPointerUp);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.enabled) return;
    if (this.state === "rotate") {
      const dx = (e.clientX - this.rotateStart.x) / this.domElement.clientHeight;
      const dy = (e.clientY - this.rotateStart.y) / this.domElement.clientHeight;
      this.sphericalDelta.theta -= dx * 2 * Math.PI * this.rotateSpeed;
      this.sphericalDelta.phi -= dy * 2 * Math.PI * this.rotateSpeed;
      this.rotateStart.set(e.clientX, e.clientY);
    } else if (this.state === "pan") {
      const dx = (e.clientX - this.panStart.x) / this.domElement.clientHeight;
      const dy = (e.clientY - this.panStart.y) / this.domElement.clientHeight;
      const offset = this.camera.position.clone().sub(this.target);
      const dist = offset.length();
      const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
      const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
      this.panOffset.add(right.multiplyScalar(-dx * dist * this.panSpeed));
      this.panOffset.add(up.multiplyScalar(dy * dist * this.panSpeed));
      this.panStart.set(e.clientX, e.clientY);
    }
  };

  private onPointerUp = () => {
    this.state = "none";
    document.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("pointerup", this.onPointerUp);
  };

  private onWheel = (e: WheelEvent) => {
    if (!this.enabled) return;
    e.preventDefault();
    if (e.deltaY > 0) {
      this.zoomScale *= 1 + 0.05 * this.zoomSpeed;
    } else {
      this.zoomScale *= 1 - 0.05 * this.zoomSpeed;
    }
  };

  update() {
    const offset = this.camera.position.clone().sub(this.target);
    this.spherical.setFromVector3(offset);

    if (this.enableDamping) {
      this.spherical.theta += this.sphericalDelta.theta * this.dampingFactor;
      this.spherical.phi += this.sphericalDelta.phi * this.dampingFactor;
    } else {
      this.spherical.theta += this.sphericalDelta.theta;
      this.spherical.phi += this.sphericalDelta.phi;
    }

    this.spherical.phi = Math.max(0.01, Math.min(Math.PI - 0.01, this.spherical.phi));
    this.spherical.radius *= this.zoomScale;
    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));

    this.target.add(this.panOffset);

    offset.setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);

    if (this.enableDamping) {
      this.sphericalDelta.theta *= 1 - this.dampingFactor;
      this.sphericalDelta.phi *= 1 - this.dampingFactor;
      this.zoomScale += (1 - this.zoomScale) * this.dampingFactor;
      this.panOffset.multiplyScalar(1 - this.dampingFactor);
    } else {
      this.sphericalDelta.set(0, 0, 0);
      this.zoomScale = 1;
      this.panOffset.set(0, 0, 0);
    }
  }

  dispose() {
    this.domElement.removeEventListener("pointerdown", this.onPointerDown);
    this.domElement.removeEventListener("wheel", this.onWheel);
    document.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("pointerup", this.onPointerUp);
  }
}
