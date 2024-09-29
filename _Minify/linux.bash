#!/bin/bash

# Function to minimize JavaScript files
function MinifyJSFiles {
    SourceDirectory="$1"
    OutputDirectory="$2"

    echo "Minimizing JavaScript files in $SourceDirectory and saving to $OutputDirectory"

    # Check if the source directory exists
    if [ ! -d "$SourceDirectory" ]; then
        echo "Source directory does not exist: $SourceDirectory"
        return 1
    fi

    # Remove the existing output directory if it exists
    if [ -d "$OutputDirectory" ]; then
        echo "Removing existing output directory: $OutputDirectory"
        rm -rf "$OutputDirectory"
    fi

    # Create the output directory
    mkdir -p "$OutputDirectory"
    echo "Created output directory: $OutputDirectory"

    # Minimize JavaScript files from the source directory and save them to the output directory using Terser
    for file in "$SourceDirectory"/*.js; do
        if [ -e "$file" ]; then
            FileName=$(basename "$file")
            OutputFileName="$OutputDirectory/$FileName"
            echo "Minimizing $file and saving to $OutputFileName"
            npx terser "$file" -o "$OutputFileName" --mangle --ecma 2024 --compress --format quote_style=1 --toplevel --timings --passes=2
        fi
    done
    echo "Minimization of JavaScript files in $SourceDirectory completed"
}

# Minimize files in the specified directories
MinifyJSFiles "./lib-unminified" "./lib"
MinifyJSFiles "./utils-unminified" "./utils"
MinifyJSFiles "./test-unminified" "./test"