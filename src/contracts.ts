// Forward canonical contracts from .opencode/artifacts/phase-1-contracts.ts
export * from "../.opencode/artifacts/phase-1-contracts";

export const DARK_MINIMALIST_TOKENS = {
  palette: {
    background: "#000000",
    surface: "#0a0a0c",
    surface_elevated: "#141416",
    primary: "#ffffff",
    primary_hover: "#e4e4e7",
    primary_muted: "rgba(255, 255, 255, 0.10)",
    accent: "#ffffff",
    text_primary: "#ffffff",
    text_secondary: "#a1a1aa",
    text_muted: "#71717a",
    border: "#222224",
    border_focus: "#ffffff",
    status_recording: "#ef4444",
    status_success: "#ffffff",
    status_error: "#ef4444",
  },
  typography: {
    font_sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    font_mono: "JetBrains Mono, ui-monospace, monospace",
    weights: {
      regular: 400,
      semibold: 600,
    },
    line_length_max: "80ch",
  },
  radii: {
    card_radius: "4px",
    button_radius: "4px",
    tag_radius: "2px",
  },
  motion: {
    duration_standard: "180ms",
    duration_emphasis: "320ms",
    timing_function: "cubic-bezier(0.16, 1, 0.3, 1)",
  },
} as const;

export const PAGE_COPY = {
  brand: {
    name: "ASCII Studio Desktop",
    tagline: "Dark Minimalist Terminal & Real-Time ASCII Engine",
    status_sandbox: "Tauri Native Sandbox Sealed",
  },
  navigation: {
    tab_image: "Image",
    tab_video: "Video",
    tab_procedural: "3D Procedural",
    tab_camera: "Live Camera",
    tab_settings: "Settings",
  },
  hero: {
    headline: "Real-Time ASCII Art Engine",
    subheading:
      "Transform images, video streams, and live camera input into high-contrast ASCII grids.",
  },
  media_picker: {
    title: "Media Source Selection",
    description:
      "Drop video files, connect live camera, or capture stills directly into the ASCII pipeline.",
    dropzone_prompt: "Drop video file here or click to browse",
    dropzone_subtext: "Supports MP4, WebM, MOV up to 500MB",
    btn_browse: "Browse Video File",
    btn_start_camera: "Open Live Camera",
    btn_stop_camera: "Close Camera",
    btn_record_start: "Start Recording",
    btn_record_stop: "Stop Recording",
    btn_snap_photo: "Capture Snapshot",
    btn_retake: "Retake Media",
    btn_confirm_media: "Use in ASCII Engine",
    status_idle: "Awaiting media source selection",
    status_recording: "Recording live camera feed...",
    status_captured: "Media captured and ready for conversion",
    status_uploaded: "Video file loaded into engine",
  },
  permission_dialog: {
    title: "Camera Permission Required",
    description:
      "ASCII Studio requires camera access to stream live video and snap still frames. Please allow camera permissions in system settings.",
    btn_open_settings: "Open System Settings",
    btn_retry: "Retry Access",
    btn_dismiss: "Cancel",
    error_denied: "Camera permission denied by operating system.",
    error_no_device: "No compatible camera device detected on this system.",
    error_in_use: "Camera is currently in use by another application.",
  },
  controls: {
    btn_import_image: "Select Source Image",
    btn_import_video: "Select Video File",
    btn_start_stream: "Start Camera Stream",
    btn_stop_stream: "Stop Camera Stream",
    btn_render_frame: "Render ASCII Frame",
    btn_export_txt: "Export Text (.txt)",
    btn_export_png: "Export Canvas PNG",
    btn_copy_clipboard: "Copy to Clipboard",
    btn_copied_feedback: "Copied to Clipboard",
    label_contrast: "Contrast",
    label_brightness: "Brightness",
    label_gamma: "Gamma",
    label_charset_select: "Character Ramp Preset",
    label_color_mode: "Color Matrix Output",
    label_tier_select: "Hardware Acceleration Tier",
    label_resolution: "Grid Dimensions",
  },
  procedural_scenes: {
    donut_title: "Rotating Torus (Donut)",
    sphere_title: "Lambertian Sphere",
    cube_title: "Wireframe / Solid Cube",
    planet_title: "Orbiting Planet & Rings",
    blackhole_title: "Gravitational Lensing Black Hole",
  },
  engine_tiers: {
    tier1_title: "WebGPU Compute Atlas (Primary - 60 FPS)",
    tier2_title: "WebGL2 Fragment Shader (Fallback 1)",
    tier3_title: "Canvas 2D CPU Rasterizer (Fallback 2)",
    sidecar_title: "Rust Native Sidecar (Heavy Batch I/O)",
  },
  empty_state: {
    title: "No Source Media Loaded",
    description:
      "Upload a video, snap a camera photo, or select a procedural 3D scene to begin.",
    action: "Load Demo Scene",
  },
  error_boundary: {
    title: "Renderer Fault Encountered",
    description:
      "The active GPU context was interrupted or the input buffer exceeded platform memory limits. The engine has automatically reset the render canvas.",
    btn_fallback_tier: "Switch to Canvas 2D Fallback",
    btn_retry: "Restart Renderer Engine",
  },
  confirmation: {
    export_success: "ASCII Art successfully saved to target path.",
    sidecar_healthy: "Rust Engine Sidecar connected and operational.",
    acl_verified: "Tauri Sandbox capabilities verified. Filesystem isolation active.",
    media_loaded: "Media successfully initialized in ASCII pipeline.",
  },
  zen_mode: {
    btn_enter_zen: "Enter Zen Mode",
    btn_exit_zen: "Exit Zen Mode",
    tooltip_zen: "Toggle distraction-free Zen canvas lock",
    status_zen_active: "Zen Mode Active - Press Escape or click unlock pill to restore",
  },
  workspaces: {
    tab_new_workspace: "New Workspace",
    btn_close_workspace: "Close Workspace",
    empty_workspace_title: "Workspace Empty",
    empty_workspace_desc: "Select media source or scene for this isolated workspace.",
    badge_active: "Active Session",
    badge_paused: "Paused Background",
  },
} as const;
