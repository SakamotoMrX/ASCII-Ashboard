pub mod ascii;
pub mod commands;

use commands::{
    convert_image_binary, export_ascii_file, get_platform_telemetry, get_procedural_frame,
    render_ascii_frame,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance_or_default())
        .invoke_handler(tauri::generate_handler![
            render_ascii_frame,
            convert_image_binary,
            get_procedural_frame,
            get_platform_telemetry,
            export_ascii_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running ascii art tauri application");
}

fn tauri_plugin_single_instance_or_default<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("ascii_core").build()
}
