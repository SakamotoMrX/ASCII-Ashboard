//! Path canonicalization and sandbox security guards (STRESS-4 defense).

use std::path::{Path, PathBuf};

#[derive(Debug, thiserror::Error)]
pub enum SecurityError {
    #[error("Path traversal detected: attempt to escape sandbox boundary")]
    PathTraversal,
    #[error("Target path does not exist: {0}")]
    NotFound(String),
    #[error("Forbidden file extension: {0}")]
    ForbiddenExtension(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

/// Allowed extensions for export and import
const ALLOWED_IMPORT_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "webp", "bmp", "gif"];
const ALLOWED_EXPORT_EXTENSIONS: &[&str] = &["txt", "png", "ans", "json", "html"];

/// Validate that a path is safe, does not contain `..` traversal sequences,
/// and has an approved file extension.
pub fn validate_and_sanitize_path(
    user_path: &str,
    is_export: bool,
    allowed_roots: &[PathBuf],
) -> Result<PathBuf, SecurityError> {
    let raw_path = Path::new(user_path);

    // Prevent explicit traversal tokens
    for component in raw_path.components() {
        if let std::path::Component::ParentDir = component {
            return Err(SecurityError::PathTraversal);
        }
    }

    // Check extension
    if let Some(ext) = raw_path.extension().and_then(|e| e.to_str()) {
        let ext_lower = ext.to_lowercase();
        let allowed = if is_export {
            ALLOWED_EXPORT_EXTENSIONS.contains(&ext_lower.as_str())
        } else {
            ALLOWED_IMPORT_EXTENSIONS.contains(&ext_lower.as_str())
        };

        if !allowed {
            return Err(SecurityError::ForbiddenExtension(ext_lower));
        }
    } else {
        return Err(SecurityError::ForbiddenExtension("none".to_string()));
    }

    // Canonicalize if file exists or check parent dir for export
    let canonical = if raw_path.exists() {
        raw_path.canonicalize()?
    } else if is_export {
        if let Some(parent) = raw_path.parent() {
            if parent.as_os_str().is_empty() {
                std::env::current_dir()?.join(raw_path)
            } else if parent.exists() {
                parent.canonicalize()?.join(raw_path.file_name().unwrap_or_default())
            } else {
                return Err(SecurityError::NotFound(parent.to_string_lossy().to_string()));
            }
        } else {
            std::env::current_dir()?.join(raw_path)
        }
    } else {
        return Err(SecurityError::NotFound(user_path.to_string()));
    };

    // If allowed_roots are provided, enforce containment
    if !allowed_roots.is_empty() {
        let in_scope = allowed_roots.iter().any(|root| {
            if let Ok(canon_root) = root.canonicalize() {
                canonical.starts_with(&canon_root)
            } else {
                canonical.starts_with(root)
            }
        });

        if !in_scope {
            return Err(SecurityError::PathTraversal);
        }
    }

    Ok(canonical)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_rejects_parent_directory_traversal() {
        let res = validate_and_sanitize_path("../../../../etc/passwd", false, &[]);
        assert!(matches!(res, Err(SecurityError::PathTraversal)));
    }

    #[test]
    fn test_rejects_unapproved_extension() {
        let res = validate_and_sanitize_path("test.exe", false, &[]);
        assert!(matches!(res, Err(SecurityError::ForbiddenExtension(_))));
    }

    #[test]
    fn test_accepts_valid_temp_file() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("sample.png");
        std::fs::write(&file_path, b"test").unwrap();

        let res = validate_and_sanitize_path(file_path.to_str().unwrap(), false, &[dir.path().to_path_buf()]);
        assert!(res.is_ok());
    }
}
