# Future-proof packaging script (Inclusion-based)

echo "📦 Packaging extension for Chrome..."

# Explicitly list the core assets required for the extension
ASSETS=(
    "manifest.json"
    "background.js"
    "ui/"
    "content/"
    "icons/"
    "worker/"
)

# Zip only the listed assets
# -r recurses into directories
# -FS (File Sync) ensures the zip matches the source (removes deleted files)
zip -rFS json-viewer-extension.zip "${ASSETS[@]}"

echo "✅ Done! Created json-viewer-extension.zip"
echo "Payload contains: ${ASSETS[*]}"
