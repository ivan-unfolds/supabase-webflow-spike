#!/bin/bash

# Get current UK time
UK_TIME=$(TZ=Europe/London date '+%d/%m/%Y, %H:%M:%S')

# Update the BUILD_VERSION in auth-spike.js
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|const BUILD_VERSION = \".*\"|const BUILD_VERSION = \"$UK_TIME\"|" auth-spike.js
else
    # Linux
    sed -i "s|const BUILD_VERSION = \".*\"|const BUILD_VERSION = \"$UK_TIME\"|" auth-spike.js
fi

echo "Updated BUILD_VERSION to: $UK_TIME"